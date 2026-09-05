/** @type {import('./_venera_.js')} */
class M58puxin extends ComicSource {
  name = "58漫画网";
  key = "legacy_58puxin";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.58puxin.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  parseCards(doc, base) {
    const comics = [];
    for (const card of [...doc.querySelectorAll(".itemBox"), ...doc.querySelectorAll(".list-comic")]) {
      const link = card.querySelector("a");
      const image = card.querySelector("mip-img, img");
      const id = this.absolute(this.attr(link, "href"), base);
      const title = this.text(card.querySelector(".title")) || this.text(card.querySelector(".txtA")) || this.text(link);
      if (id && title) comics.push(new Comic({ id, title, cover: this.attr(image, "src") || "", subTitle: this.text(card.querySelector(".coll, .info")) }));
    }
    return comics;
  }
  chaptersOf(doc) {
    let links = doc.querySelectorAll("#chapter-list-1 li a");
    if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a");
    if (!links.length) links = doc.querySelectorAll(".list ul li a");
    if (!links.length) links = doc.querySelectorAll(".detail-list-select li a");
    const ch = {};
    for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) ch[u] = t; }
    return ch;
  }
  search = { load: async (keyword, options, page) => { const doc = await this.html(`${this.baseUrl}/search/?keywords=${encodeURIComponent(keyword)}&page=${page}`); const cs = this.parseCards(doc, this.baseUrl); if (!cs.length) throw "没有解析到搜索结果（站点页面结构可能已更新）"; return { comics: cs, maxPage: 1 }; }, enableTagsSuggestions: false };
  comic = {
    loadInfo: async (id) => {
      const doc = await this.html(id);
      const tags = { "作者": [], "类型": [] };
      for (const dd of doc.querySelectorAll(".pic_zi dd, .pic dd")) { const t = this.text(dd); if (t && t.length < 30) tags["作者"].push(t); }
      return new ComicDetails({ title: this.text(doc.querySelector("h1")) || this.text(doc.querySelector(".title")), cover: this.absolute(this.attr(doc.querySelector("#Cover img, .pic img, img"), "src")), description: this.text(doc.querySelector(".txtDesc")), tags, chapters: this.chaptersOf(doc) });
    },
    loadEp: async (comicId, epId) => {
      const images = []; let url = epId; let guard = 0; const seen = {};
      while (url && guard < 20) {
        guard++;
        const doc = await this.html(url);
        for (const img of doc.querySelectorAll(".erPag mip-img, .erPag img, .comicpage mip-img, .comicpage img, #chapter-image img")) {
          const src = this.attr(img, "data-src") || this.attr(img, "src");
          if (src && !src.startsWith("data:") && !seen[src]) { seen[src] = true; images.push(/^https?:/.test(src) ? src : this.absolute(src)); }
        }
        let next = "";
        for (const a of doc.querySelectorAll("a")) { const t = this.text(a); if (t && t.includes("下一页")) { next = this.absolute(this.attr(a, "href")); break; } }
        if (!next || next === url) break;
        url = next;
      }
      if (!images.length) throw "没有找到章节图片（可能被站点验证页拦截）";
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}