const db = wx.cloud.database();

Page({
  data: {
    // --- Static Data ---
    categories: ["上衣", "下裙", "配饰"],
    seasons: ["夏", "春秋", "冬"],

    // --- Dynamic Data from DB ---
    allTags: [],

    // --- Form Data ---
    _id: null,
    imageUrl: "",
    originalImageUrl: "",
    name: "",
    category: "",
    season: "",
    remark: "",
    attributes: {}, // 用于存储所有动态属性的键值对
    sizes: {},

    // --- Dynamic Picker & Input Options ---
    currentAttributePickers: [],
    currentSizeFields: []
  },

  onLoad(options) {
    if (options.id) {
      this.loadClotheData(options.id);
    } else {
      wx.showToast({ title: '缺少衣物ID', icon: 'none' });
      wx.navigateBack();
    }
  },

  async loadClotheData(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const clotheRes = await db.collection('clothes').doc(id).get();
      const clothe = clotheRes.data;

      const tagsRes = await db.collection('tags').get();
      const allTags = tagsRes.data;

      // 将衣物数据中的动态属性字段提取到 attributes 对象中
      const attributes = {};
      const attributeTags = allTags.filter(t => t.type === 'attribute');
      attributeTags.forEach(tag => {
        if (clothe[tag.field]) {
          attributes[tag.field] = clothe[tag.field];
        }
      });

      this.setData({
        _id: clothe._id,
        name: clothe.name,
        imageUrl: clothe.imageUrl,
        originalImageUrl: clothe.imageUrl,
        category: clothe.category,
        season: clothe.season,
        remark: clothe.remark,
        sizes: clothe.sizes || {},
        attributes: attributes, // 设置新的attributes对象
        allTags: allTags
      }, () => {
        this.updateDynamicFields();
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(err);
    }
  },

  updateDynamicFields() {
    const { category, allTags } = this.data;
    if (!category) return;
    const attributePickers = allTags.filter(tag => tag.type === 'attribute' && tag.category.includes(category) && tag.field !== 'season');
    const sizeTag = allTags.find(tag => tag.type === 'size' && tag.category.includes(category));
    const sizeFields = sizeTag ? sizeTag.fields : [];
    this.setData({ currentAttributePickers: attributePickers, currentSizeFields: sizeFields });
  },

  // --- Event Handlers ---
  chooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => { this.setData({ imageUrl: res.tempFilePaths[0] }); } });
  },

  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },

  onCategoryChange(e) {
    const newCategory = this.data.categories[e.detail.value];
    this.setData({ category: newCategory, attributes: {}, sizes: {} }, () => { this.updateDynamicFields(); });
  },

  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },

  onAttributeChange(e) {
    const { field, options } = e.currentTarget.dataset;
    const selectedOption = options[e.detail.value];
    this.setData({ [`attributes.${field}`]: selectedOption });
  },

  onSizeInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`sizes.${key}`]: e.detail.value });
  },

  clearPicker(e) {
    const { key, field } = e.currentTarget.dataset;
    if (key === 'category') {
      this.setData({ category: "", currentAttributePickers: [], currentSizeFields: [] });
    } else if (key === 'season') {
      this.setData({ season: "" });
    } else {
      this.setData({ [`attributes.${field}`]: "" });
    }
  },

  // --- Core Logic ---
  async updateClothe() {
    if (!this.data.name || !this.data.category) {
      wx.showToast({ title: "名称和分类为必填项", icon: "none" });
      return;
    }
    wx.showLoading({ title: '正在保存...' });

    try {
      let newImageUrl = this.data.originalImageUrl;
      let oldImageToDelete = null; // 用于标记待删除的旧图

      // 检查用户是否更改了图片
      if (this.data.imageUrl !== this.data.originalImageUrl) {
        // Case 1: 用户选择了新的本地图片进行上传
        if (this.data.imageUrl && (this.data.imageUrl.startsWith('wxfile:') || this.data.imageUrl.startsWith('http://tmp/'))) {
          const uploadResult = await wx.cloud.uploadFile({ cloudPath: `clothes/${Date.now()}.png`, filePath: this.data.imageUrl });
          newImageUrl = uploadResult.fileID;
          if (this.data.originalImageUrl && this.data.originalImageUrl.startsWith('cloud:')) {
            oldImageToDelete = this.data.originalImageUrl; // 标记旧图，待数据库更新成功后再删除
          }
        } 
        // Case 2: 用户清空了图片
        else if (!this.data.imageUrl) {
          newImageUrl = '';
          if (this.data.originalImageUrl && this.data.originalImageUrl.startsWith('cloud:')) {
            oldImageToDelete = this.data.originalImageUrl; // 标记旧图，待数据库更新成功后再删除
          }
        }
      }

      const dataToUpdate = {
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: newImageUrl,
        sizes: this.data.sizes,
        ...this.data.attributes
      };

      // 步骤1：先更新数据库
      await db.collection('clothes').doc(this.data._id).update({ data: dataToUpdate });

      // 步骤2：数据库更新成功后，再删除旧的云文件
      if (oldImageToDelete) {
        wx.cloud.deleteFile({ fileList: [oldImageToDelete] }).catch(err => {
          console.error("删除旧云文件失败: ", err); // 删除失败只记录日志，不影响用户体验
        });
      }

      wx.hideLoading();
      wx.showToast({ title: "更新成功" });
      setTimeout(() => { wx.navigateBack(); }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error('更新失败', err);
    }
  }
});
