/** @type {import('./_venera_.js')} */
class Bnmanhua extends ComicSource {
  name = "百年漫画";
  key = "legacy_bnmanhua";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.bnmanhua.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  absolute(url, base = this.baseUrl) { if (!url) return ""; return /^https?:\/\//i.test(url) ? url : (url.startsWith("/") ? base + url : base + "/" + url); }
  text(el) { return el ? (el.text || "").trim() : ""; }
  attr(el, name) { return el && el.attributes ? (el.attributes[name] || "") : ""; }
  async html(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return new HtmlDocument(r.body); }
  search = {
    load: async (keyword, options, page) => {
      const doc = await this.html(`${this.baseUrl}/search/${encodeURIComponent(keyword)}`);
      const comics = [];
      for (const card of doc.querySelectorAll("#list_img li")) {
        const link = card.querySelector("a");
        const id = this.absolute(this.attr(link, "href"));
        const title = this.text(card.querySelector("p")) || this.text(link);
        if (id && title) comics.push(new Comic({ id, title, cover: this.attr(card.querySelector("img"), "data-src") || this.attr(card.querySelector("img"), "src") || "", subTitle: this.text(card.querySelector("span")) }));
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
      if (!links.length) links = doc.querySelectorAll(".chapter-list-1 li a, .list ul li a, .detail-list-select li a");
      for (const a of links) { const u = this.absolute(this.attr(a, "href")); const t = this.text(a); if (u && t) chapters[u] = t; }
      const tags = { "作者": [], "类型": [] };
      const lis = doc.querySelectorAll(".info li");
      if (lis.length > 3) tags["作者"].push(this.text(lis[3]));
      if (lis.length > 2) tags["类型"].push(this.text(lis[2]));
      return new ComicDetails({ title: this.text(doc.querySelector("h2")) || this.text(doc.querySelector("h1")), cover: this.attr(doc.querySelector(".img mip-img, .img img"), "src") || "", description: this.metaDesc(doc), tags, chapters });
    },
    metaDesc(doc) { const m = doc.querySelector('meta[name="description"]'); return m ? (m.attributes["content"] || "").trim() : ""; },
    loadEp: async (comicId, epId) => {
      const res = await Network.get(epId, this.headers);
      if (res.status !== 200) throw `请求失败：${res.status}`;
      const images = [];
      const m = res.body.match(/z_img\s*=\s*'([^']*)'/);
      if (m) {
        try {
          const arr = JSON.parse(m[1]);
          for (const v of arr) {
            let u = String(v).trim();
            if (!/^https?:/.test(u)) u = "https://img.hngxgt.net/" + u;
            images.push(u);
          }
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