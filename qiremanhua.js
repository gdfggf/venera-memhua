/** @type {import('./_venera_.js')} */
class Qiremanhua extends ComicSource {
  name = "奇热漫画";
  key = "legacy_qiremanhua";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.qiremanhua.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  async json(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return JSON.parse(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const data = await this.json(`${this.baseUrl}/book/ajax_search?key=${encodeURIComponent(keyword)}&page=${page}`);
      const list = (data && data.data) || data || [];
      const comics = [];
      for (const it of list) {
        const bid = it.book_id || it.id;
        const title = it.book_name || it.name;
        if (bid && title) comics.push(new Comic({ id: `${this.baseUrl}/book/${bid}/`, title, cover: it.book_cover || it.book_unruly || "", subTitle: it.last_chapter_name || "" }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const m = String(id).match(/book\/(\d+)\/?$/);
      const bid = m ? m[1] : String(id);
      const doc = await this.html(`${this.baseUrl}/book/${bid}/`);
      const chapters = {};
      try {
        const toc = await this.json(`${this.baseUrl}/book/chaplist_ajax?sort=1&book_id=${bid}`);
        const list = (toc && (toc.data || toc.list || toc.chapter)) || toc || [];
        for (const it of list) {
          const chId = it.c_id || it.id || it.cartoon_id || it.chapter_id;
          const name = it.name || it.chapter_name || it.cartoon_name || it.title;
          if (chId && name) chapters[`${this.baseUrl}/book/read?book_id=${bid}&c_id=${chId}`] = name;
        }
      } catch (_) { }
      if (!Object.keys(chapters).length) {
        for (const a of doc.querySelectorAll("#chapter-list-1 li a, .episode-list a, .chapter-list a, .detail-list-select li a")) {
          const u = this.absolute(this.attr(a, "href")); const t = this.text(a);
          if (u && t) chapters[u] = t;
        }
      }
      const tags = { "作者": [], "类型": [] };
      const author = this.text(doc.querySelector(".book-container__author")); if (author) tags["作者"].push(author.replace("作者：", ""));
      for (const a of doc.querySelectorAll(".book-hero__detail .item a")) tags["类型"].push(this.text(a));
      return new ComicDetails({ title: this.text(doc.querySelector(".book-hero__detail .title")) || this.text(doc.querySelector("h1")), cover: this.attr(doc.querySelector(".book-container img, img"), "src") || "", description: this.text(doc.querySelector(".book-container__detail")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const doc = await this.html(epId);
      const images = [];
      for (const img of doc.querySelectorAll(".episode-detail img, .content img, .comicpage img")) {
        const src = this.attr(img, "data-original") || this.attr(img, "data-src") || this.attr(img, "src");
        if (src && /^https?:/.test(src) && !src.startsWith("data:")) images.push(src);
      }
      let url = epId; let guard = 0; const seen = {};
      while (url && guard < 12) {
        guard++;
        const d = url === epId ? doc : await this.html(url);
        for (const img of d.querySelectorAll(".episode-detail img, .content img")) {
          const src = this.attr(img, "data-original") || this.attr(img, "src");
          if (src && /^https?:/.test(src) && !seen[src]) { seen[src] = true; images.push(src); }
        }
        let next = "";
        for (const a of d.querySelectorAll("a")) { const t = this.text(a); if (t && t.includes("下一页")) { next = this.absolute(this.attr(a, "href")); break; } }
        if (!next || next === url) break;
        url = next;
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}