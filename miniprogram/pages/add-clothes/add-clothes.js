const db = wx.cloud.database();

Page({
  data: {
    // --- Static Data (from DB) ---
    categories: ["上衣", "下裙", "配饰"],
    seasons: ["夏", "春秋", "冬"],
    attributeTags: [], // 从tags集合加载的衣物属性标签
    sizeTags: [],      // 从tags集合加载的尺寸标签

    // --- Form Data ---
    image: "",
    name: "",
    category: "",
    season: "",
    remark: "",

    // Category specific fields (values selected by user)
    sleeveType: "",
    collarType: "",
    skirtType: "",
    accessoryType: "",
    sizes: {}, // 存储所有尺寸信息

    // --- Dynamic Picker Options ---
    currentSleeveTypes: [],
    currentCollarTypes: [],
    currentSkirtTypes: [],
    currentAccessoryTypes: [],
    currentSizeLabels: [] // 当前分类下的尺寸标签
  },

  onLoad() {
    this.loadTagsAndInitialize();
  },

  // 加载标签数据并初始化页面
  async loadTagsAndInitialize() {
    wx.showLoading({ title: '加载标签...' });
    try {
      const res = await db.collection('tags').get();
      const tags = res.data;
      const attributeTags = tags.filter(t => t.type === '衣物属性');
      const sizeTags = tags.filter(t => t.type === '尺寸标签');

      this.setData({
        attributeTags,
        sizeTags
      }, () => {
        // 确保标签加载后再初始化尺寸标签
        this.updateSizeLabels();
        // 确保标签加载后再初始化分类相关的picker选项
        this.updateCategoryPickers();
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载标签失败', icon: 'none' });
      console.error('加载标签失败', err);
    }
  },

  // 根据当前分类更新尺寸标签和picker选项
  updateSizeLabels() {
    const { category, sizeTags } = this.data;
    const currentSizeLabels = sizeTags.filter(t => 
      t.category && (t.category.includes(category) || t.category === '通用')
    );
    this.setData({ currentSizeLabels });
  },

  updateCategoryPickers() {
    const { category, attributeTags } = this.data;
    const getOptions = (fieldName) => {
      const tag = attributeTags.find(t => t.fieldName === fieldName);
      return tag ? tag.options : [];
    };

    this.setData({
      currentSleeveTypes: getOptions('sleeveType'),
      currentCollarTypes: getOptions('collarType'),
      currentSkirtTypes: getOptions('skirtType'),
      currentAccessoryTypes: getOptions('accessoryType'),
    });
  },

  // --- Event Handlers ---
  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },

  onCategoryChange(e) {
    const newCategory = this.data.categories[e.detail.value];
    this.setData({
      category: newCategory,
      // 重置所有分类专属字段
      sleeveType: "",
      collarType: "",
      skirtType: "",
      accessoryType: "",
      sizes: {}
    }, () => {
      this.updateSizeLabels();
      this.updateCategoryPickers();
    });
  },

  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },

  onSleeveChange(e) { this.setData({ sleeveType: this.data.currentSleeveTypes[e.detail.value] }); },
  onCollarChange(e) { this.setData({ collarType: this.data.currentCollarTypes[e.detail.value] }); },
  onSkirtTypeChange(e) { this.setData({ skirtType: this.data.currentSkirtTypes[e.detail.value] }); },
  onAccessoryTypeChange(e) { this.setData({ accessoryType: this.data.currentAccessoryTypes[e.detail.value] }); },

  onSizeInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`sizes.${key}`]: e.detail.value });
  },

  clearPicker(e) { this.setData({ [e.currentTarget.dataset.key]: "" }); },

  chooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => { this.setData({ image: res.tempFilePaths[0] }); } });
  },

  // --- Core Logic ---
  async saveClothe() {
    if (!this.data.image || !this.data.name || !this.data.category) {
      wx.showToast({ title: "图片、名称和分类为必填项", icon: "none" });
      return;
    }
    wx.showLoading({ title: '正在保存...' });
    try {
      const cloudPath = `clothes/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
      const uploadResult = await wx.cloud.uploadFile({ cloudPath, filePath: this.data.image });

      const dataToSave = {
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: uploadResult.fileID,
        createdAt: db.serverDate()
      };

      // 动态添加分类专属字段
      const attributeTagFields = this.data.attributeTags.map(t => t.fieldName);
      attributeTagFields.forEach(field => {
        if (this.data[field]) dataToSave[field] = this.data[field];
      });

      // 动态添加尺寸字段
      const sizeFieldNames = this.data.currentSizeLabels.map(t => t.name); // 使用name作为key
      const sizesToSave = {};
      sizeFieldNames.forEach(fieldName => {
        if (this.data.sizes[fieldName]) sizesToSave[fieldName] = this.data.sizes[fieldName];
      });
      dataToSave.sizes = sizesToSave;

      await db.collection('clothes').add({ data: dataToSave });
      wx.hideLoading();
      wx.showToast({ title: "保存成功" });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      console.error('保存失败', err);
    }
  }
});