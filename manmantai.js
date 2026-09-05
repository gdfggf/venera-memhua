/** @type {import('./_venera_.js')} */
class Manmantai extends ComicSource {
  name = "漫漫睇";
  key = "legacy_manmantai";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.manmantai.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`https://www.manmantai.com/search/?keywords=${encodeURIComponent(keyword)}&page=${page}`);
      const comics = [];
      const cards = [...doc.querySelectorAll(".rank-list li"), ...doc.querySelectorAll(".book-list li")];
      for (const card of cards) {
        const link = card.querySelector(".ell a") || card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"), "https://www.manmantai.com");
        const title = this.text(card.querySelector(".ell a")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.absolute(this.attr(card.querySelector("img"), "src") || ""), subTitle: this.text(card.querySelector(".tt")) }));
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
      let links = doc.querySelectorAll("#chapter-list-1 li a, .chapter-list-1 li a, .detail-list a, .list ul li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t && t.length < 40) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      for (const a of doc.querySelectorAll(".detail-list li span a")) { const t = this.text(a); if (t && t.length < 30) tags["作者"].push(t); }
      return new ComicDetails({ title: this.text(doc.querySelector(".book-title h1")) || this.text(doc.querySelector("h1")), cover: this.absolute(this.attr(doc.querySelector(".book-cover img, .pic img, img"), "src") || ""), description: this.text(doc.querySelector("#intro-all")) || this.text(doc.querySelector("#intro-cut")), tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const cm = res.body.match(/chapterImages\s*=\s*(\[[\s\S]*?\]);/);
      const pm = res.body.match(/chapterPath\s*=\s*["']([^"']+)["']/);
      if (!cm) throw "未找到 chapterImages（站点页面结构可能已更新）";
      let values;
      try { values = JSON.parse(cm[1]); } catch (_) { values = JSON.parse(cm[1].replace(/'/g, '"')); }
      const path = pm ? pm[1] : "";
      const images = values.map(v => /^https?:/.test(v) ? v : "https://img001.arc-theday.com/" + path + v).filter(u => !u.startsWith("data:"));
      if (!images.length) throw "章节没有可用图片";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}