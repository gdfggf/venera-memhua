/** @type {import('./_venera_.js')} */
class Comicun extends ComicSource {
  name = "漫画联合国";
  key = "legacy_comicun";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://www.comicun.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/search-index?q=${encodeURIComponent(keyword)}&page=${page}`);
      const comics = [];
      for (const card of doc.querySelectorAll("#dmList li")) {
        const link = card.querySelector("dt a");
        const image = card.querySelector("img");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector("dt"));
        if (id && title) comics.push(new Comic({ id, title, cover: this.attr(image, "src") || "", subTitle: this.text(card.querySelector("dd p span")) }));
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
      let links = doc.querySelectorAll("#play_1 li a");
      if (!links.length) links = doc.querySelectorAll("#chapter-list-1 li a, .chapter-list-1 li a, .list ul li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const author = this.text(doc.querySelector('a[itemprop="author"]')); if (author) tags["作者"].push(author);
      return new ComicDetails({ title: this.text(doc.querySelector("h1")) || "", cover: this.attr(doc.querySelector(".cover img, .pic img, img"), "src") || "", description: this.text(doc.querySelector(".intro, #intro")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const doc = await this.html(epId);
      const images = [];
      const img = doc.querySelector("#ComicPic");
      if (img) {
        const src = this.attr(img, "src") || "";
        const m = src.match(/^(.+?\/)(\d+)(\.\w+)$/);
        const totalEl = doc.querySelector("#total");
        let total = 0;
        if (totalEl) total = parseInt(this.attr(totalEl, "value") || "", 10);
        if (m && total > 0) {
          const start = parseInt(m[2], 10);
          if (start > 0 && src.startsWith("http") && !images.includes(src)) images.push(src);
          for (let i = start + 1; i < start + total && images.length < 2000; i++) images.push(m[1] + i + m[3]);
        } else if (m && !total) {
          for (const i2 of doc.querySelectorAll("#ComicPic, .comic-page img, img")) {
            const s = this.attr(i2, "src");
            if (s && /^https?:/.test(s)) images.push(s);
          }
        }
      }
      if (!images.length) {
        for (const i3 of doc.querySelectorAll(".content img, .comic-page img, img")) {
          const s = this.attr(i3, "data-src") || this.attr(i3, "src");
          if (s && /^https?:/.test(s) && !s.startsWith("data:")) images.push(s);
        }
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}