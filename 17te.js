/** @type {import('./_venera_.js')} */
class M17te extends ComicSource {
  name = "特漫网站";
  key = "legacy_17te";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://www.17te.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  styleUrl(el) { const s = this.attr(el, "style") || ""; const mm = s.match(/url\((['"]?)(.*?)\1\)/); return mm ? mm[2] : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/search?keyword=${encodeURIComponent(keyword)}`);
      const comics = [];
      for (const card of doc.querySelectorAll(".mh-item, .mh-item2")) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector("h2")) || this.text(link);
        if (id && title && title.length < 60) comics.push(new Comic({ id, title, cover: this.styleUrl(card.querySelector(".mh-cover")) || "" }));
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
      const links = doc.querySelectorAll("#detail-list-select li a, .detail-list-select li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const author = this.text(doc.querySelector(".subtitle")); if (author) tags["作者"].push(author);
      for (const a of doc.querySelectorAll(".info p span a")) tags["类型"].push(this.text(a));
      return new ComicDetails({ title: this.text(doc.querySelector(".detail-main-info-title")) || this.text(doc.querySelector("h1")), cover: this.absolute(this.attr(doc.querySelector(".banner_detail_form img"), "src") || this.attr(doc.querySelector(".detail-main-cover img"), "src") || ""), description: this.text(doc.querySelector(".detail-desc")) || this.text(doc.querySelector(".info p")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const doc = await this.html(epId);
      const images = [];
      for (const img of doc.querySelectorAll(".comicpage img, .detail-content img")) {
        const src = this.attr(img, "data-src") || this.attr(img, "src");
        const alt = this.attr(img, "alt") || "";
        if (src && /^https?:/.test(src) && !src.startsWith("data:") && !alt.includes("()")) images.push(src);
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}