const db = wx.cloud.database();

Page({
  data: {
    name: "",
    outfitImage: "", // 本地临时路径

    // --- 已选中的衣物 ---
    selectedTops: [],
    selectedSkirts: [],
    selectedAccessories: [],

    // --- 选择弹窗相关 ---
    isSelectorShow: false,
    currentCategory: "",
    selectableClothes: [], // 弹窗中当前分类下的所有衣物
    loadingClothes: false,
    tempSelectedIds: new Set() // 弹窗中临时勾选的衣物ID
  },

  // --- 主页面逻辑 ---
  onInput(e) {
    this.setData({ name: e.detail.value });
  },

  chooseOutfitImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({ outfitImage: res.tempFilePaths[0] });
      }
    });
  },

  removeSelectedItem(e) {
    const { id, category } = e.currentTarget.dataset;
    const keyMap = {
      '上衣': 'selectedTops',
      '下裙': 'selectedSkirts',
      '配饰': 'selectedAccessories'
    };
    const key = keyMap[category];
    const currentSelection = this.data[key];
    const newSelection = currentSelection.filter(item => item._id !== id);
    this.setData({ [key]: newSelection });
  },

  // --- 弹窗相关逻辑 ---
  openSelector(e) {
    const { category } = e.currentTarget.dataset;
    this.setData({ 
      currentCategory: category,
      isSelectorShow: true,
      loadingClothes: true,
      selectableClothes: []
    });

    // 加载衣物
    db.collection('clothes').where({ category: category }).get().then(res => {
      // 标记已选中的衣物
      const currentSelectedIds = this.getCurrentSelectedIds(category);
      const clothes = res.data.map(item => ({
        ...item,
        selected: currentSelectedIds.has(item._id)
      }));
      this.setData({ 
        selectableClothes: clothes,
        loadingClothes: false,
        tempSelectedIds: new Set(currentSelectedIds) // 初始化弹窗内的勾选状态
      });
    });
  },

  getCurrentSelectedIds(category) {
    const keyMap = {
      '上衣': 'selectedTops',
      '下裙': 'selectedSkirts',
      '配饰': 'selectedAccessories'
    };
    const key = keyMap[category];
    return new Set(this.data[key].map(item => item._id));
  },

  toggleClothSelection(e) {
    const { id } = e.currentTarget.dataset;
    const { selectableClothes, tempSelectedIds } = this.data;

    // 更新勾选状态
    if (tempSelectedIds.has(id)) {
      tempSelectedIds.delete(id);
    } else {
      tempSelectedIds.add(id);
    }

    // 更新UI
    const newSelectableClothes = selectableClothes.map(item => ({
      ...item,
      selected: tempSelectedIds.has(item._id)
    }));

    this.setData({ 
      selectableClothes: newSelectableClothes,
      tempSelectedIds: tempSelectedIds
    });
  },

  closeSelector() {
    const { currentCategory, tempSelectedIds, selectableClothes } = this.data;
    const keyMap = {
      '上衣': 'selectedTops',
      '下裙': 'selectedSkirts',
      '配饰': 'selectedAccessories'
    };
    const key = keyMap[currentCategory];

    // 按选择顺序排序
    const finalSelection = Array.from(tempSelectedIds).map(id => 
      selectableClothes.find(item => item._id === id)
    );

    this.setData({ 
      [key]: finalSelection,
      isSelectorShow: false 
    });
  },

  // --- 保存逻辑 ---
  async saveOutfit() {
    if (!this.data.name) {
      wx.showToast({ title: '请给穿搭起个名字', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      let outfitImageUrl = "";
      // 1. 处理穿搭图
      if (this.data.outfitImage) {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `outfits/${Date.now()}.png`,
          filePath: this.data.outfitImage
        });
        outfitImageUrl = uploadResult.fileID;
      } else if (this.data.selectedSkirts.length > 0) {
        outfitImageUrl = this.data.selectedSkirts[0].imageUrl;
      }

      // 2. 整理衣物ID
      const clothesIds = [
        ...this.data.selectedTops.map(i => i._id),
        ...this.data.selectedSkirts.map(i => i._id),
        ...this.data.selectedAccessories.map(i => i._id)
      ];

      // 3. 存入数据库
      await db.collection('outfits').add({
        data: {
          name: this.data.name,
          outfitImageUrl: outfitImageUrl,
          clothes: clothesIds,
          createdAt: db.serverDate()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
      setTimeout(() => wx.navigateBack(), 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(err);
    }
  }
});
