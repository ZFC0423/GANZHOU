<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import { getArticleListApi } from '../../api/article';
import { getHomeConfigDetailApi, updateHomeConfigApi } from '../../api/home-config';
import { getScenicListApi } from '../../api/scenic';

const loading = ref(false);
const saving = ref(false);
const scenicOptions = ref([]);
const articleOptions = ref([]);

const moduleOptions = [
  { label: '景点图谱', value: 'scenic' },
  { label: '城脉与老城生活', value: 'food' },
  { label: '客乡与手艺', value: 'heritage' },
  { label: '红土与记忆', value: 'red_culture' }
];

const visualRoleOptions = [
  { label: '主位', value: 'lead' },
  { label: '辅助', value: 'support' },
  { label: '侧位', value: 'aside' }
];

const moodToneOptions = [
  { label: '琥珀', value: 'amber' },
  { label: '土褐', value: 'earth' },
  { label: '漆红', value: 'crimson' },
  { label: '墨色', value: 'ink' },
  { label: '松绿', value: 'pine' }
];

function createDefaultChapterConfig(chapterCode, defaults = {}) {
  const fallbackMap = {
    food: {
      chapterTitle: '城脉与老城生活',
      chapterSubtitle: '从味觉、街巷和夜色进入赣州。',
      moodTone: 'amber'
    },
    heritage: {
      chapterTitle: '客乡与手艺',
      chapterSubtitle: '从器物、聚落和代际传承进入赣州。',
      moodTone: 'earth'
    },
    red_culture: {
      chapterTitle: '红土与记忆',
      chapterSubtitle: '从旧址、纪念空间与历史路径进入赣州。',
      moodTone: 'crimson'
    }
  };

  return {
    chapterCode,
    chapterTitle: defaults.chapterTitle || fallbackMap[chapterCode].chapterTitle,
    chapterSubtitle: defaults.chapterSubtitle || fallbackMap[chapterCode].chapterSubtitle,
    chapterIntro: defaults.chapterIntro || '',
    heroImage: defaults.heroImage || '',
    heroCaption: defaults.heroCaption || '',
    routeLabel: defaults.routeLabel || '',
    moodTone: defaults.moodTone || fallbackMap[chapterCode].moodTone,
    sort: defaults.sort ?? 0,
    status: defaults.status ?? 1
  };
}

function createRecommendEntry() {
  return {
    moduleName: 'scenic',
    targetType: 'scenic',
    targetId: null,
    visualRole: 'support',
    summaryOverride: '',
    sort: 0,
    status: 1
  };
}

const form = reactive({
  siteName: '',
  siteDescription: '',
  homeHeroImage: '',
  homeHeroNote: '',
  chapterConfigs: [
    createDefaultChapterConfig('food', { sort: 1 }),
    createDefaultChapterConfig('heritage', { sort: 2 }),
    createDefaultChapterConfig('red_culture', { sort: 3 })
  ],
  recommendEntries: []
});

const sectionSummary = computed(() => {
  return `当前维护 ${form.chapterConfigs.length} 个章节、${form.recommendEntries.length} 条首页推荐位。`;
});

function mergeChapterConfigs(chapterConfigs = []) {
  const incomingMap = chapterConfigs.reduce((result, item) => {
    result[item.chapterCode] = item;
    return result;
  }, {});

  return [
    createDefaultChapterConfig('food', { ...incomingMap.food, sort: incomingMap.food?.sort ?? 1 }),
    createDefaultChapterConfig('heritage', { ...incomingMap.heritage, sort: incomingMap.heritage?.sort ?? 2 }),
    createDefaultChapterConfig('red_culture', { ...incomingMap.red_culture, sort: incomingMap.red_culture?.sort ?? 3 })
  ];
}

function getTargetOptions(targetType) {
  return targetType === 'article' ? articleOptions.value : scenicOptions.value;
}

async function loadTargetOptions() {
  const [scenicResponse, articleResponse] = await Promise.all([
    getScenicListApi({ page: 1, pageSize: 100 }),
    getArticleListApi({ page: 1, pageSize: 100 })
  ]);

  scenicOptions.value = (scenicResponse.data.list || []).map((item) => ({
    label: `${item.name} (#${item.id})`,
    value: item.id
  }));

  articleOptions.value = (articleResponse.data.list || []).map((item) => ({
    label: `${item.title} (#${item.id})`,
    value: item.id
  }));
}

async function loadDetail() {
  loading.value = true;

  try {
    const response = await getHomeConfigDetailApi();
    const data = response.data || {};

    form.siteName = data.siteName || '';
    form.siteDescription = data.siteDescription || '';
    form.homeHeroImage = data.homeHeroImage || '';
    form.homeHeroNote = data.homeHeroNote || '';
    form.chapterConfigs = mergeChapterConfigs(data.chapterConfigs || []);
    form.recommendEntries = (data.recommendEntries || []).map((item) => ({
      moduleName: item.moduleName || 'scenic',
      targetType: item.targetType || 'scenic',
      targetId: item.targetId || null,
      visualRole: item.visualRole || 'support',
      summaryOverride: item.summaryOverride || '',
      sort: item.sort ?? 0,
      status: item.status ?? 1
    }));
  } finally {
    loading.value = false;
  }
}

function addRecommendEntry() {
  form.recommendEntries.push(createRecommendEntry());
}

function removeRecommendEntry(index) {
  form.recommendEntries.splice(index, 1);
}

function handleTargetTypeChange(entry) {
  entry.targetId = null;
}

async function saveConfig() {
  saving.value = true;

  try {
    await updateHomeConfigApi({
      siteName: form.siteName,
      siteDescription: form.siteDescription,
      homeHeroImage: form.homeHeroImage,
      homeHeroNote: form.homeHeroNote,
      chapterConfigs: form.chapterConfigs.map((item, index) => ({
        ...item,
        sort: index + 1
      })),
      recommendEntries: form.recommendEntries.map((item, index) => ({
        ...item,
        sort: item.sort === '' || item.sort === null ? index : Number(item.sort || 0)
      }))
    });

    ElMessage.success('首页配置已更新');
    await loadDetail();
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadTargetOptions(), loadDetail()]);
});
</script>

<template>
  <AdminShell>
    <div class="admin-page admin-page--stack" v-loading="loading">
      <el-card>
        <div class="admin-toolbar">
          <div class="admin-toolbar__grow">
            <div class="admin-page-title">首页与章节配置</div>
            <div class="admin-muted-text">
              这里决定前台首页的开屏语气、三大章节入口和首页推荐位，是最重要的前台策展控制台。
            </div>
            <div class="admin-muted-text">{{ sectionSummary }}</div>
          </div>
          <el-button type="primary" :loading="saving" @click="saveConfig">
            {{ saving ? '保存中...' : '保存配置' }}
          </el-button>
        </div>
      </el-card>

      <el-card>
        <template #header>
          <div class="admin-page-title">首页开屏</div>
        </template>

        <el-form label-width="150px">
          <el-form-item label="站点名称">
            <el-input v-model="form.siteName" placeholder="例如：赣州长卷" />
          </el-form-item>
          <el-form-item label="站点说明">
            <el-input v-model="form.siteDescription" type="textarea" rows="2" placeholder="用于首页与全站的核心定位说明" />
          </el-form-item>
          <el-form-item label="开屏主图">
            <el-input v-model="form.homeHeroImage" placeholder="/immersive/hero/..." />
          </el-form-item>
          <el-form-item label="开屏题注">
            <el-input
              v-model="form.homeHeroNote"
              type="textarea"
              rows="2"
              placeholder="建议写成一句短题注，而不是功能说明。"
            />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card>
        <template #header>
          <div class="admin-page-title">章节配置</div>
        </template>

        <div class="admin-form-stack">
          <el-card v-for="chapter in form.chapterConfigs" :key="chapter.chapterCode" shadow="never">
            <template #header>
              <div class="admin-toolbar">
                <div class="admin-toolbar__grow">
                  <div>{{ chapter.chapterTitle }}</div>
                  <div class="admin-muted-text">章节编码：{{ chapter.chapterCode }}</div>
                </div>
                <el-switch v-model="chapter.status" :active-value="1" :inactive-value="0" />
              </div>
            </template>

            <el-form label-width="150px">
              <el-form-item label="章节标题">
                <el-input v-model="chapter.chapterTitle" />
              </el-form-item>
              <el-form-item label="章节副标题">
                <el-input v-model="chapter.chapterSubtitle" />
              </el-form-item>
              <el-form-item label="章节导语">
                <el-input
                  v-model="chapter.chapterIntro"
                  type="textarea"
                  rows="3"
                  placeholder="用于前台列表页或首页章节桥段的策展说明。"
                />
              </el-form-item>
              <el-form-item label="章节头图">
                <el-input v-model="chapter.heroImage" />
              </el-form-item>
              <el-form-item label="头图题注">
                <el-input v-model="chapter.heroCaption" type="textarea" rows="2" />
              </el-form-item>
              <el-form-item label="路线标签">
                <el-input v-model="chapter.routeLabel" placeholder="例如：老城夜读线 / 客家手艺线" />
              </el-form-item>
              <el-form-item label="章节色调">
                <el-select v-model="chapter.moodTone" class="admin-form-control">
                  <el-option v-for="item in moodToneOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </el-form>
          </el-card>
        </div>
      </el-card>

      <el-card>
        <template #header>
          <div class="admin-toolbar">
            <div class="admin-toolbar__grow">
              <div class="admin-page-title">首页推荐位</div>
              <div class="admin-muted-text">推荐位负责把景点与文章组织成首页的章节入口，而不是简单做内容堆叠。</div>
            </div>
            <el-button @click="addRecommendEntry">新增推荐位</el-button>
          </div>
        </template>

        <div class="admin-form-stack">
          <el-card v-for="(entry, index) in form.recommendEntries" :key="index" shadow="never">
            <template #header>
              <div class="admin-toolbar">
                <div class="admin-toolbar__grow">
                  <div>推荐位 {{ index + 1 }}</div>
                  <div class="admin-muted-text">决定内容在哪个章节中出现，以及它承担主位还是辅助位。</div>
                </div>
                <el-button link type="danger" @click="removeRecommendEntry(index)">删除</el-button>
              </div>
            </template>

            <el-form label-width="150px">
              <el-form-item label="所属模块">
                <el-select v-model="entry.moduleName" class="admin-form-control">
                  <el-option v-for="item in moduleOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="内容类型">
                <el-select v-model="entry.targetType" class="admin-form-control" @change="handleTargetTypeChange(entry)">
                  <el-option label="景点" value="scenic" />
                  <el-option label="文章" value="article" />
                </el-select>
              </el-form-item>
              <el-form-item label="目标内容">
                <el-select v-model="entry.targetId" class="admin-form-control" filterable placeholder="请选择景点或文章">
                  <el-option
                    v-for="item in getTargetOptions(entry.targetType)"
                    :key="`${entry.targetType}-${item.value}`"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="视觉角色">
                <el-select v-model="entry.visualRole" class="admin-form-control">
                  <el-option v-for="item in visualRoleOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="摘要覆盖文案">
                <el-input
                  v-model="entry.summaryOverride"
                  type="textarea"
                  rows="2"
                  placeholder="如果前台需要不同于原文摘要的入口文案，可以在这里覆盖。"
                />
              </el-form-item>
              <el-form-item label="排序">
                <el-input-number v-model="entry.sort" :min="0" />
              </el-form-item>
              <el-form-item label="启用状态">
                <el-switch v-model="entry.status" :active-value="1" :inactive-value="0" />
              </el-form-item>
            </el-form>
          </el-card>

          <el-empty v-if="!form.recommendEntries.length" description="暂时还没有首页推荐位" />
        </div>
      </el-card>
    </div>
  </AdminShell>
</template>
