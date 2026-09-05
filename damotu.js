/** @type {import('./_venera_.js')} */
class Damotu extends ComicSource {
  name = "大魔兔";
  key = "legacy_damotu";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "http://m.damotu.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  bgCover(card) {
    for (const el of card.querySelectorAll("*")) {
      const s = this.attr(el, "style") || "";
      const m = s.match(/url\(\s*['"]?(https?:\/\/[^'")]+)/);
      if (m) return m[1];
    }
    return "";
  }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/list-${page}-k${encodeURIComponent(keyword)}.htm`);
      const comics = [];
      const uls = doc.querySelectorAll("ul");
      const ul = uls.length ? uls[uls.length - 1] : null;
      for (const card of (ul ? ul.querySelectorAll("li") : [])) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.attr(link, "title") || this.text(card.querySelector("a")) || "";
        if (id && title) comics.push(new Comic({ id, title, cover: this.bgCover(card) }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const doc = await this.html(id);
      const tags = { "作者": [], "类型": [] };
      const cols = doc.querySelectorAll(".col-12");
      if (cols.length > 1) tags["作者"].push(this.text(cols[1]));
      if (cols.length > 2) tags["类型"].push(this.text(cols[2]));
      const chapters = {};
      let links = doc.querySelectorAll("#book-part li a");
      if (!links.length) links = doc.querySelectorAll(".book-part li a");
      if (!links.length) links = doc.querySelectorAll("#chapter-list-1 li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      return new ComicDetails({ title: this.text(doc.querySelector("h1")) || (cols.length ? this.text(cols[0]) : ""), cover: this.attr(doc.querySelector(".book-detail-cover img, .detail-cover img, img"), "src") || "", description: this.text(doc.querySelector(".book-detail-body")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const doc = await this.html(epId);
      const images = [];
      for (const img of doc.querySelectorAll(".swiper-container img, .swiper-slide img, .content img")) {
        const src = this.attr(img, "data-src") || this.attr(img, "src");
        if (src && !src.startsWith("data:") && !src.includes("blank")) images.push(this.absolute(src));
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}