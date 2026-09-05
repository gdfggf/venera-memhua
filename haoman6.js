/** @type {import('./_venera_.js')} */
class Haoman6 extends ComicSource {
  name = "好漫6";
  key = "legacy_haoman6";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://www.haoman6.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/index.php/search?key=${encodeURIComponent(keyword)}`);
      const comics = [];
      for (const card of doc.querySelectorAll(".common-comic-item")) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector(".comic__title")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.attr(card.querySelector("img"), "data-original") || this.attr(card.querySelector("img"), "src") || "", subTitle: this.text(card.querySelector(".comic-update")) }));
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
      if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a, .list ul li a, .detail-list-select li a, .catalog a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      for (const a of doc.querySelectorAll(".name a")) { const t = this.text(a); if (t) tags["作者"].push(t); }
      for (const a of doc.querySelectorAll(".comic-status a")) tags["类型"].push(this.text(a));
      return new ComicDetails({ title: this.text(doc.querySelector(".j-comic-title")) || this.text(doc.querySelector("h1")), cover: this.attr(doc.querySelector(".pic img, .cover img, img"), "data-original") || this.attr(doc.querySelector(".pic img, .cover img, img"), "src") || "", description: this.text(doc.querySelector(".intro-total")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const doc = await this.html(epId);
      const images = [];
      for (const img of doc.querySelectorAll(".rd-article__pic img, .content img, .comicpage img")) {
        const src = this.attr(img, "data-src") || this.attr(img, "src");
        if (src && /^https?:/.test(src) && !src.startsWith("data:") && !/\.png(\?|$)/.test(src)) images.push(src);
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}