const localStorage = require('../../utils/localStorage.js');

Page({
  data: {
    _id: null,
    originalOutfitImageUrl: "",
    name: "",
    outfitImage: "",
    season: "",
    seasons: ["夏", "春秋", "冬"],

    // --- 已选中的衣物 ---
    selectedTops: [],
    selectedSkirts: [],
    selectedAccessories: [],

    // --- 动态标签数据 ---
    allTags: [],

    // --- 选择弹窗相关 ---
    isSelectorShow: false,
    currentCategory: "",
    selectableClothes: [],
    loadingClothes: false,
    tempSelectedIds: [],
    filterOptions: [],
    currentFilter: '全部',

    // --- 弹窗分页 ---
    selectorPage: 0,
    selectorHasMore: true,
  },

  onLoad(options) {
    if (options.id) {
      this.loadTagsAndOutfit(options.id);
    } else {
      wx.showToast({ title: '缺少穿搭ID', icon: 'none' });
      wx.navigateBack();
    }
  },

  async loadTagsAndOutfit(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      // 从本地存储加载标签和穿搭数据
      const allTags = localStorage.getTags();
      const allOutfits = localStorage.getOutfits();
      const outfit = allOutfits.find(o => o.id === id); // Find outfit by id

      if (!outfit || !outfit.clothesIds) { // Use clothesIds
        throw new Error('加载穿搭信息失败');
      }

      const allClothes = localStorage.getClothes();
      const clothesMap = new Map(allClothes.map(item => [item.id, item])); // Use item.id

      const tops = [], skirts = [], accessories = [];
      outfit.clothesIds.forEach(clotheId => { // Use outfit.clothesIds
        const clothe = clothesMap.get(clotheId);
        if (clothe) {
          if (clothe.category === '上衣') tops.push(clothe);
          if (clothe.category === '下裙') skirts.push(clothe);
          if (clothe.category === '配饰') accessories.push(clothe);
        }
      });

      this.setData({
        allTags: allTags,
        _id: outfit.id, // Use outfit.id
        name: outfit.name,
        season: outfit.season,
        outfitImage: outfit.outfitImageUrl,
        originalOutfitImageUrl: outfit.outfitImageUrl,
        selectedTops: tops,
        selectedSkirts: skirts,
        selectedAccessories: accessories
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载数据失败', icon: 'none' });
      console.error(err);
    }
  },

  // --- 主页面逻辑 ---
  onInput(e) { this.setData({ name: e.detail.value }); },
  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },
  clearPicker(e) { this.setData({ [e.currentTarget.dataset.key]: "" }); },

  chooseOutfitImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => { this.setData({ outfitImage: res.tempFilePaths[0] }); } });
  },

  removeSelectedItem(e) {
    const { id, category } = e.currentTarget.dataset;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const newSelection = this.data[keyMap[category]].filter(item => item.id !== id); // Use item.id
    this.setData({ [keyMap[category]]: newSelection });
  },

  // --- 弹窗相关逻辑 ---
  openSelector(e) {
    const { category } = e.currentTarget.dataset;
    const { allTags } = this.data;
    const filterFieldMap = { '上衣': 'sleeveType', '下裙': 'skirtType', '配饰': 'accessoryType' };
    const mainFilterField = filterFieldMap[category];
    const tagData = allTags.find(t => t.field === mainFilterField);
    const filterOptions = tagData ? ['全部', ...tagData.options] : ['全部'];

    // 从当前已选中的衣物ID初始化数组，以保留顺序
    const currentSelectedIds = this.getCurrentSelectedIds(category);

    this.setData({ 
      currentCategory: category,
      isSelectorShow: true,
      currentFilter: '全部',
      filterOptions: filterOptions,
      tempSelectedIds: [...currentSelectedIds] // 初始化为数组
    }, () => {
      this.loadSelectableClothes();
    });
  },

  onFilterTap(e) {
    const { filter } = e.currentTarget.dataset;
    this.setData({ currentFilter: filter }, () => { this.loadSelectableClothes(); });
  },

  loadSelectableClothes(loadMore = false) {
    if (this.data.loadingClothes && !loadMore) return; // 防止重复加载

    if (!loadMore) {
      this.setData({ 
        selectorPage: 0,
        selectorHasMore: true,
        selectableClothes: [] 
      });
    }

    this.setData({ loadingClothes: true });

    const { currentCategory, currentFilter, selectorPage, tempSelectedIds } = this.data;
    const PAGE_SIZE = 20;
    
    let allClothes = localStorage.getClothes();
    
    // 1. Filter by category
    let filteredClothes = allClothes.filter(clothe => clothe.category === currentCategory);

    // 2. Apply dynamic filter
    if (currentFilter !== '全部') {
      const filterFieldMap = {
        '上衣': 'sleeveType',
        '下裙': 'skirtType',
        '配饰': 'accessoryType'
      };
      const filterKey = filterFieldMap[currentCategory];
      if(filterKey) {
        filteredClothes = filteredClothes.filter(clothe => clothe[filterKey] === currentFilter);
      }
    }

    // 3. Sort (assuming createdAt exists and is a timestamp, though not strictly needed here)
    // filteredClothes.sort((a, b) => b.createdAt - a.createdAt); // Optional: sort if desired

    // 4. Pagination
    const startIndex = selectorPage * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const paginatedClothes = filteredClothes.slice(startIndex, endIndex);

    const newClothes = paginatedClothes.map(item => ({ ...item, selected: tempSelectedIds.includes(item.id) })); // Use item.id
    
    this.setData({ 
      selectableClothes: loadMore ? [...this.data.selectableClothes, ...newClothes] : newClothes,
      loadingClothes: false,
      selectorHasMore: newClothes.length === PAGE_SIZE,
    });
    // No .catch needed as localStorage calls are synchronous and handled internally
  },

  loadMoreSelectableClothes() {
    if (this.data.loadingClothes || !this.data.selectorHasMore) return;
    this.setData({ 
      selectorPage: this.data.selectorPage + 1 
    }, () => {
      this.loadSelectableClothes(true);
    });
  },

  getCurrentSelectedIds(category) {
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    return this.data[keyMap[category]].map(item => item.id); // Use item.id
  },

  toggleClothSelection(e) {
    const { id } = e.currentTarget.dataset;
    const { selectableClothes } = this.data;
    let tempSelectedIds = [...this.data.tempSelectedIds]; // 复制数组
    const index = tempSelectedIds.indexOf(id);

    if (index > -1) {
      tempSelectedIds.splice(index, 1); // 存在则移除
    } else {
      tempSelectedIds.push(id); // 不存在则添加
    }

    // 更新列表中的选中状态
    const newSelectableClothes = selectableClothes.map(item => ({
      ...item,
      selected: tempSelectedIds.includes(item.id) // Use item.id
    }));

    this.setData({ 
      selectableClothes: newSelectableClothes, 
      tempSelectedIds: tempSelectedIds 
    });
  },

  closeSelector() {
    const { currentCategory, tempSelectedIds } = this.data;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const categoryKey = keyMap[currentCategory];

    // 1. 获取当前分类下所有已选中的衣物对象
    const allSelectedForCategory = this.data[categoryKey];
    
    // 2. 找出所有衣物对象，以便按ID查找
    const allClothesMap = new Map();
    this.data.selectableClothes.forEach(c => allClothesMap.set(c.id, c));
    allSelectedForCategory.forEach(c => allClothesMap.set(c.id, c));

    // 3. 根据tempSelectedIds的顺序，生成最终的对象数组
    const finalItems = tempSelectedIds.map(id => allClothesMap.get(id)).filter(Boolean);

    this.setData({ 
      [categoryKey]: finalItems, 
      isSelectorShow: false 
    });
  },

  // --- 保存逻辑 ---
  async updateOutfit() {
    if (!this.data.name) {
      wx.showToast({ title: '请给穿搭起个名字', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '更新中...' });
    try {
      let finalOutfitImageUrl = this.data.originalOutfitImageUrl;
      let oldLocalImageToDelete = null; // To mark old local image for deletion

      // If user changed the image
      if (this.data.outfitImage !== this.data.originalOutfitImageUrl) {
        // Case 1: User selected a new temporary image
        if (this.data.outfitImage && (this.data.outfitImage.startsWith('wxfile://tmp/') || this.data.outfitImage.startsWith('http://tmp/'))) {
          const savedFilePath = await new Promise((resolve, reject) => {
            wx.saveFile({
              tempFilePath: this.data.outfitImage,
              success: res => resolve(res.savedFilePath),
              fail: err => reject(err)
            });
          });
          finalOutfitImageUrl = savedFilePath;
          // If original image was also a local file, mark it for deletion
          if (this.data.originalOutfitImageUrl && (this.data.originalOutfitImageUrl.startsWith('wxfile://') || this.data.originalOutfitImageUrl.startsWith('http://usr/'))) {
             oldLocalImageToDelete = this.data.originalOutfitImageUrl;
          }
        } 
        // Case 2: User cleared the image (outfitImage is empty)
        else if (!this.data.outfitImage) {
          finalOutfitImageUrl = '';
          if (this.data.originalOutfitImageUrl && (this.data.originalOutfitImageUrl.startsWith('wxfile://') || this.data.originalOutfitImageUrl.startsWith('http://usr/'))) {
             oldLocalImageToDelete = this.data.originalOutfitImageUrl;
          }
        } else {
            // Case 3: User did not change image, but it's already a local path
            finalOutfitImageUrl = this.data.outfitImage;
        }
      }

      // Re-calculate fallback image every time
      let fallbackImageUrl = "";
      if (this.data.selectedSkirts.length > 0) {
        fallbackImageUrl = this.data.selectedSkirts[0].imageUrl;
      } else if (this.data.selectedTops.length > 0) {
        fallbackImageUrl = this.data.selectedTops[0].imageUrl;
      } else if (this.data.selectedAccessories.length > 0) { // Added for more robust fallback
        fallbackImageUrl = this.data.selectedAccessories[0].imageUrl;
      }

      const clothesIds = [
        ...this.data.selectedTops.map(i => i.id), // Use i.id
        ...this.data.selectedSkirts.map(i => i.id), // Use i.id
        ...this.data.selectedAccessories.map(i => i.id) // Use i.id
      ];

      const dataToUpdate = {
        id: this.data._id, // Ensure id is present for localStorage.updateOutfit
        name: this.data.name,
        outfitImageUrl: finalOutfitImageUrl,
        fallbackImageUrl: fallbackImageUrl,
        clothesIds: clothesIds, // Changed 'clothes' to 'clothesIds' for clarity in local storage
        season: this.data.season,
      };

      localStorage.updateOutfit(dataToUpdate); // Use local storage utility

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
      wx.showToast({ title: '更新成功' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error(err);
    }
  }
});