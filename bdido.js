/** @type {import('./_venera_.js')} */
class Bdido extends ComicSource {
  name = "1359漫画网";
  key = "legacy_bdido";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.bdido.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/sort/?key=${encodeURIComponent(keyword)}`);
      const comics = [];
      for (const card of doc.querySelectorAll(".comic-sort .item li, .itemBox, .list-comic")) {
        const link = card.querySelector(".thumbnail a, a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector(".title")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.attr(card.querySelector("img"), "data-src") || this.attr(card.querySelector("img"), "src") || "", subTitle: this.text(card.querySelector(".chapter")) }));
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
      if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a, .chapterlist a, .list ul li a, .detail-list-select li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      for (const t of doc.querySelectorAll(".tags")) tags["类型"].push(this.text(t));
      return new ComicDetails({ title: this.text(doc.querySelector("h1")) || "", cover: this.attr(doc.querySelector(".comic-item .thumbnail img, .cover img, img"), "data-src") || this.attr(doc.querySelector(".comic-item .thumbnail img, .cover img, img"), "src") || "", description: "", tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/chapter_list_all\s*:\s*(\[[\s\S]*?\])\s*[,\);]/);
      if (m) {
        try {
          const arr = JSON.parse(m[1]);
          const flat = [];
          const walk = (v) => { if (typeof v === "string") flat.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const k of Object.keys(v)) { const x = v[k]; if (typeof x === "string" && (x.startsWith("http") || x.includes("imgurl"))) flat.push(x); else if (Array.isArray(x)) walk(x); } };
          walk(arr);
          for (let u of flat) {
            const q = u.match(/[?&]url=([^&]+)/); if (q) u = decodeURIComponent(q[1]);
            if (/^https?:/.test(u)) images.push(u);
          }
        } catch (_) { }
      }
      if (!images.length) {
        const doc = new HtmlDocument(res.body);
        for (const img of doc.querySelectorAll(".comiclist img, .content img, img")) {
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