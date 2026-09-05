/** @type {import('./_venera_.js')} */
class M733 extends ComicSource {
  name = "733漫画";
  key = "legacy_733so";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://www.733.so"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/statics/search.aspx?key=${encodeURIComponent(keyword)}&page=${page}`);
      const comics = [];
      for (const card of doc.querySelectorAll(".cy_list ul li, .cy_list_mh ul li")) {
        const link = card.querySelector(".title a, a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.attr(card.querySelector("img"), "data-src") || this.attr(card.querySelector("img"), "src") || "", subTitle: this.text(card.querySelector(".updata, .chapter")) }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const doc = await this.html(id);
      const chapters = {};
      let links = doc.querySelectorAll("#chapter-list-1 li a");
      if (!links.length) links = doc.querySelectorAll(".cy_zhangjie_top a");
      if (!links.length) links = doc.querySelectorAll(".chapter__item a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const xinxi = doc.querySelectorAll(".cy_xinxi");
      if (xinxi.length) { const author = this.text(xinxi[0].querySelector("a")); if (author) tags["作者"].push(author); for (const a of xinxi[0].querySelectorAll("font, a")) tags["类型"].push(this.text(a)); }
      return new ComicDetails({ title: this.text(doc.querySelector(".cy_title")) || this.text(doc.querySelector("h1")), cover: this.attr(doc.querySelector(".cy_info_cover img, .cy_info_cover a img, img"), "data-src") || this.attr(doc.querySelector(".cy_info_cover img, .cy_info_cover a img, img"), "src") || "", description: this.text(doc.querySelector("#comic-description")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/qTcms_S_m_murl_e\s*=\s*"(\[[^\]]*\])"/);
      if (m) {
        try { const arr = JSON.parse(m[1].replace(/'/g, '"')); for (const u of arr) if (u && /^https?:/.test(u)) images.push(u); } catch (_) { }
      }
      if (!images.length) {
        const doc = new HtmlDocument(res.body);
        for (const img of doc.querySelectorAll(".rd-article-wr img, .comicpage img, .content img")) {
          const src = this.attr(img, "data-src") || this.attr(img, "src");
          if (src && /^https?:/.test(src) && !src.startsWith("data:")) images.push(src);
        }
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}