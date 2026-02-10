const localStorage = require('../../utils/localStorage.js');

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
      const allClothes = localStorage.getClothes();
      const clothe = allClothes.find(c => c.id === id); // Find clothe by id

      if (!clothe) {
        wx.hideLoading();
        wx.showToast({ title: '衣物未找到', icon: 'none' });
        wx.navigateBack();
        return;
      }

      const allTags = localStorage.getTags(); // Get tags from local storage

      // 将衣物数据中的动态属性字段提取到 attributes 对象中
      const attributes = {};
      const attributeTags = allTags.filter(t => t.type === 'attribute');
      attributeTags.forEach(tag => {
        if (clothe[tag.field]) {
          attributes[tag.field] = clothe[tag.field];
        }
      });

      this.setData({
        _id: clothe.id, // Use 'id' from local storage
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
      console.log('--- 开始更新衣物 ---');
      console.log('this.data.imageUrl (当前):', this.data.imageUrl);
      console.log('this.data.originalImageUrl (原始):', this.data.originalImageUrl);

      let finalImageUrl = this.data.originalImageUrl;
      let oldLocalImageToDelete = null; // To mark old local image for deletion

      // Check if user changed the image
      if (this.data.imageUrl !== this.data.originalImageUrl) {
        console.log('图片已更改。');
        // Case 1: User selected a new temporary image
        if (this.data.imageUrl && (this.data.imageUrl.startsWith('wxfile://tmp/') || this.data.imageUrl.startsWith('http://tmp/'))) {
          console.log('正在保存新图片到本地...');
          try {
            const savedFilePath = await new Promise((resolve, reject) => {
              wx.saveFile({
                tempFilePath: this.data.imageUrl,
                success: res => resolve(res.savedFilePath),
                fail: err => reject(err)
              });
            });
            console.log('新图片本地保存路径:', savedFilePath);
            finalImageUrl = savedFilePath;
            // If original image was also a local file, mark it for deletion
            if (this.data.originalImageUrl && (this.data.originalImageUrl.startsWith('wxfile://') || this.data.originalImageUrl.startsWith('http://usr/'))) {
               oldLocalImageToDelete = this.data.originalImageUrl;
               console.log('标记旧本地图片待删除:', oldLocalImageToDelete);
            }
          } catch (saveErr) {
            console.error('保存新图片到本地失败:', saveErr);
            wx.showToast({ title: `新图片保存失败: ${saveErr.errMsg}`, icon: 'none' });
            // 如果新图片保存失败，保留原始图片路径，不更新 finalImageUrl
            // finalImageUrl = this.data.originalImageUrl; // 保持旧图不变, 或者设置为默认图
          }
        } 
        // Case 2: User cleared the image
        else if (!this.data.imageUrl) {
          console.log('图片已清空。');
          finalImageUrl = '';
          if (this.data.originalImageUrl && (this.data.originalImageUrl.startsWith('wxfile://') || this.data.originalImageUrl.startsWith('http://usr/'))) {
             oldLocalImageToDelete = this.data.originalImageUrl;
             console.log('标记旧本地图片待删除:', oldLocalImageToDelete);
          }
        } else { // Case 3: this.data.imageUrl is not a temp path, and not empty. It's already a local permanent path.
          finalImageUrl = this.data.imageUrl;
          console.log('图片未更改，或已是本地路径:', finalImageUrl);
        }
      }
      console.log('最终图片路径 finalImageUrl:', finalImageUrl);
      console.log('oldLocalImageToDelete:', oldLocalImageToDelete);

      const dataToUpdate = {
        id: this.data._id, // Ensure id is present for localStorage.updateClothes
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: finalImageUrl,
        sizes: this.data.sizes,
        ...this.data.attributes
      };

      // Update local storage
      localStorage.updateClothes(dataToUpdate);

      // Delete old local image if marked
      if (oldLocalImageToDelete) {
        wx.removeSavedFile({
          filePath: oldLocalImageToDelete,
          fail: err => {
            console.error("删除旧本地文件失败: ", err); // Log failure, don't block
          }
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
