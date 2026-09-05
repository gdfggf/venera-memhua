/** @type {import('./_venera_.js')} */
class Manhuayang extends ComicSource {
  name = "漫画羊";
  key = "legacy_manhuayang";
  version = "0.1.0";
  minAppVersion = "1.6.0";
  url = "";
  get baseUrl() { return "https://m.manhuayang.com"; }
  get headers() { return { "User-Agent": "Mozilla/5.0", "Referer": this.baseUrl + "/" }; }
  async json(url) { const r = await Network.get(url, this.headers); if (r.status !== 200) throw `请求失败：${r.status}`; return JSON.parse(r.body); }
  detailApi(cid) { return `${this.baseUrl}/api/getComicInfoBody?comic_id=${cid}`; }
  search = {
    load: async (keyword, options, page) => {
      const data = await this.json(`${this.baseUrl}/api/getsortlist/?search_key=${encodeURIComponent(keyword)}`);
      const list = (data && data.data && data.data.data) || (data && data.data) || data || [];
      const comics = [];
      for (const it of (list || [])) {
        const cid = it.comic_id || it.id;
        const title = it.comic_name || it.name;
        if (cid && title) comics.push(new Comic({ id: `${this.baseUrl}/read/${cid}`, title, cover: cid ? `https://cover.manhuayang.com/mh/${cid}.jpg-300x400.webp` : "", subTitle: it.last_chapter_name || "" }));
      }
      if (!comics.length) throw "没有解析到搜索结果（站点页面结构可能已更新）";
      return { comics, maxPage: 1 };
    },
    enableTagsSuggestions: false
  };
  comic = {
    loadInfo: async (id) => {
      const m = String(id).match(/read\/(\d+)/); const cid = m ? m[1] : String(id);
      const data = await this.json(this.detailApi(cid));
      const d = (data && data.data) || data || {};
      const chapters = {};
      const list = d.comic_chapter || [];
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        const name = it.comic_chapter_name || it.chapter_name || it.name || `第${i + 1}话`;
        chapters[`${this.baseUrl}/read/${cid}/${i}`] = name;
      }
      const tags = { "作者": [], "类型": [] };
      if (d.comic_author) tags["作者"].push(d.comic_author);
      if (Array.isArray(d.comic_type)) for (const t of d.comic_type) if (t) tags["类型"].push(String(t.name || t));
      return new ComicDetails({ title: d.comic_name || "", cover: (d.cover_list && d.cover_list[1]) || (d.cover_list && d.cover_list[0]) || "", description: d.comic_desc || "", tags, chapters });
    },
    loadEp: async (comicId, epId) => {
      const m = String(epId).match(/read\/(\d+)\/(\d+)/); if (!m) throw "无效的章节地址";
      const cid = m[1]; const idx = parseInt(m[2], 10);
      const data = await this.json(this.detailApi(cid));
      const d = (data && data.data) || data || {};
      const list = d.comic_chapter || [];
      const total = parseInt(d.totalChapterNum || list.length, 10);
      const pos = total - (idx + 1);
      const item = list[pos] || list[idx];
      if (!item) throw "章节不存在";
      const endNum = parseInt(item.end_num, 10);
      const rule = item.rule;
      const domain = item.chapter_domain;
      if (!endNum || !rule || !domain) throw "章节规则缺失";
      const images = [];
      for (let i = 1; i <= endNum; i++) images.push("https://" + domain + rule.replace(/\$\$/g, i) + "-asmh.middle.webp");
      return { images };
    },
    onImageLoad: () => ({ headers: this.headers })
  };
}