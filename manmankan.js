/** @type {import('./_venera_.js')} */
class Manmankan extends ComicSource {
  name = "漫漫看漫画网";
  key = "legacy_manmankan";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.manmankan.cc"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  meta(doc, name) { const m = doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`); if (m) { const v = ((m.attributes["content"] || "") + (m.attributes["property"] === name ? "" : "")); return v.trim(); } return ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/sort/?key=${encodeURIComponent(keyword)}&page=${page}`);
      const comics = [];
      const cards = [...doc.querySelectorAll(".comic-sort li"), ...doc.querySelectorAll(".item")];
      for (const card of cards) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector("h3")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.absolute(this.attr(card.querySelector("img"), "data-src") || this.attr(card.querySelector("img"), "src") || ""), subTitle: this.text(card.querySelector(".chapter")) }));
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
      let links = doc.querySelectorAll(".chapterlist a");
      if (!links.length) links = doc.querySelectorAll("#chapter-list-1 li a");
      if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a");
      if (!links.length) links = doc.querySelectorAll(".list ul li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const author = this.meta(doc, "og:novel:author"); if (author) tags["作者"].push(author);
      const kind = this.meta(doc, "og:novel:category"); if (kind) for (const k of kind.split(/[,\/|]/)) if (k.trim()) tags["类型"].push(k.trim());
      return new ComicDetails({ title: this.text(doc.querySelector("h1")) || this.meta(doc, "og:novel:book_name") || "", cover: this.absolute(this.attr(doc.querySelector(".cover-bg img, .cover img, img"), "data-src") || this.attr(doc.querySelector(".cover-bg img, .cover img, img"), "src") || ""), description: this.text(doc.querySelector(".content")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/chapter_list_all\s*:\s*(\[[\s\S]*?\])\s*[,;]/);
      if (m) {
        try {
          const arr = JSON.parse(m[1]);
          const flat = [];
          const walk = (v) => { if (typeof v === "string") flat.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const k of Object.keys(v)) { if (typeof v[k] === "string" && /^https?:/.test(v[k])) flat.push(v[k]); else if (Array.isArray(v[k])) walk(v[k]); } };
          walk(arr);
          for (const u of [...new Set(flat)]) if (/^https?:/.test(u)) images.push(u);
        } catch (_) { }
      }
      if (!images.length) {
        const doc = new HtmlDocument(res.body);
        for (const img of doc.querySelectorAll(".content img, .reading img, img")) {
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