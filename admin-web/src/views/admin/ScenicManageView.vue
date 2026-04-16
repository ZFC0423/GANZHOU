<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AdminShell from '../../components/AdminShell.vue';
import { postScenicCopywritingApi } from '../../api/ai';
import {
  createScenicApi,
  deleteScenicApi,
  getScenicDetailApi,
  getScenicListApi,
  updateScenicApi,
  updateScenicStatusApi
} from '../../api/scenic';
import { getToken } from '../../utils/auth';

const loading = ref(false);
const dialogVisible = ref(false);
const dialogMode = ref('create');
const aiGenerating = ref(false);
const aiModelName = ref('');
const formRef = ref();
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});
const filters = reactive({
  keyword: '',
  region: ''
});
const tableData = ref([]);
const scenicCategoryOptions = [
  { label: '自然景点', value: 1 },
  { label: '历史人文', value: 2 }
];
const moodToneOptions = [
  { label: '琥珀', value: 'amber' },
  { label: '土褐', value: 'earth' },
  { label: '漆红', value: 'crimson' },
  { label: '墨色', value: 'ink' },
  { label: '松绿', value: 'pine' }
];
const uploadAction = `${import.meta.env.VITE_ADMIN_API_BASE || 'http://localhost:3000'}/api/admin/upload/image`;
const form = reactive({
  id: null,
  name: '',
  region: '',
  categoryId: 1,
  coverImage: '',
  galleryImages: '',
  intro: '',
  cultureDesc: '',
  heroCaption: '',
  routeLabel: '',
  moodTone: 'amber',
  quote: '',
  bestVisitSeason: '',
  visitMode: '',
  pairingSuggestion: '',
  bestLightTime: '',
  walkingIntensity: '',
  photoPoint: '',
  familyFriendly: 1,
  openTime: '',
  ticketInfo: '',
  suggestedDuration: '',
  address: '',
  trafficGuide: '',
  tips: '',
  tags: '',
  recommendFlag: 0,
  hotScore: 0,
  status: 1,
  aiNotes: ''
});

const rules = {
  name: [{ required: true, message: '请输入景点名称', trigger: 'blur' }],
  region: [{ required: true, message: '请输入所属地区', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
};

function resetForm() {
  Object.assign(form, {
    id: null,
    name: '',
    region: '',
    categoryId: 1,
    coverImage: '',
    galleryImages: '',
    intro: '',
    cultureDesc: '',
    heroCaption: '',
    routeLabel: '',
    moodTone: 'amber',
    quote: '',
    bestVisitSeason: '',
    visitMode: '',
    pairingSuggestion: '',
    bestLightTime: '',
    walkingIntensity: '',
    photoPoint: '',
    familyFriendly: 1,
    openTime: '',
    ticketInfo: '',
    suggestedDuration: '',
    address: '',
    trafficGuide: '',
    tips: '',
    tags: '',
    recommendFlag: 0,
    hotScore: 0,
    status: 1,
    aiNotes: ''
  });
  aiModelName.value = '';
}

const uploadHeaders = {
  Authorization: `Bearer ${getToken()}`
};

function handleCoverUploadSuccess(response) {
  form.coverImage = response.data.url;
  ElMessage.success('封面上传成功');
}

function handleUploadError() {
  ElMessage.error('上传失败');
}

function buildPayload() {
  return {
    name: form.name,
    region: form.region,
    categoryId: form.categoryId,
    coverImage: form.coverImage,
    galleryImages: form.galleryImages,
    intro: form.intro,
    cultureDesc: form.cultureDesc,
    heroCaption: form.heroCaption,
    routeLabel: form.routeLabel,
    moodTone: form.moodTone,
    quote: form.quote,
    bestVisitSeason: form.bestVisitSeason,
    visitMode: form.visitMode,
    pairingSuggestion: form.pairingSuggestion,
    bestLightTime: form.bestLightTime,
    walkingIntensity: form.walkingIntensity,
    photoPoint: form.photoPoint,
    familyFriendly: form.familyFriendly,
    openTime: form.openTime,
    ticketInfo: form.ticketInfo,
    suggestedDuration: form.suggestedDuration,
    address: form.address,
    trafficGuide: form.trafficGuide,
    tips: form.tips,
    tags: form.tags,
    recommendFlag: form.recommendFlag,
    hotScore: form.hotScore,
    status: form.status
  };
}

function parseTagsForAi(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function confirmOverwriteIfNeeded() {
  if (!form.intro && !form.cultureDesc) {
    return true;
  }

  try {
    await ElMessageBox.confirm(
      'AI 生成文案会覆盖当前的景点简介和文化说明，确认继续吗？',
      '覆盖确认',
      { type: 'warning' }
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function handleGenerateCopywriting() {
  const name = String(form.name || '').trim();

  if (!name) {
    ElMessage.warning('请先输入景点名称');
    return;
  }

  const confirmed = await confirmOverwriteIfNeeded();

  if (!confirmed) {
    return;
  }

  aiGenerating.value = true;
  aiModelName.value = '';

  try {
    const response = await postScenicCopywritingApi({
      targetId: form.id || null,
      name,
      region: form.region,
      tags: parseTagsForAi(form.tags),
      notes: form.aiNotes
    });

    form.intro = response.data.intro || '';
    form.cultureDesc = response.data.culture_desc || '';
    aiModelName.value = response.data.model_name || '';
    ElMessage.success('AI 文案生成成功');
  } catch (error) {
    aiModelName.value = '';
  } finally {
    aiGenerating.value = false;
  }
}

async function loadTable() {
  loading.value = true;

  try {
    const response = await getScenicListApi({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      region: filters.region
    });

    tableData.value = response.data.list;
    pagination.total = response.data.total;
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
}

async function openEditDialog(row) {
  const response = await getScenicDetailApi(row.id);
  dialogMode.value = 'edit';
  Object.assign(form, {
    ...response.data,
    galleryImages: (response.data.galleryImages || []).join(','),
    tags: (response.data.tags || []).join(','),
    aiNotes: ''
  });
  aiModelName.value = '';
  dialogVisible.value = true;
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false);

  if (!valid) {
    return;
  }

  const payload = buildPayload();

  try {
    if (dialogMode.value === 'create') {
      await createScenicApi(payload);
      ElMessage.success('景点已创建');
    } else {
      await updateScenicApi(form.id, payload);
      ElMessage.success('景点已更新');
    }

    dialogVisible.value = false;
    await loadTable();
  } catch (error) {
    // 请求拦截器已统一处理提示
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除景点“${row.name}”吗？`, '删除确认', { type: 'warning' });
    await deleteScenicApi(row.id);
    ElMessage.success('景点已删除');
    await loadTable();
  } catch (error) {
    // 取消删除时不额外提示
  }
}

async function handleStatusChange(row, value) {
  try {
    await updateScenicStatusApi(row.id, { status: value ? 1 : 0 });
    ElMessage.success('状态已更新');
    await loadTable();
  } catch (error) {
    // 请求拦截器已统一处理提示
  }
}

function handleSearch() {
  pagination.page = 1;
  loadTable();
}

onMounted(loadTable);
</script>

<template>
  <AdminShell>
    <div class="admin-page admin-page--stack">
      <el-card>
        <div class="admin-toolbar">
          <div class="admin-toolbar__grow">
            <div class="admin-page-title">景点内容管理</div>
            <div class="admin-muted-text">
              这里同时维护景点基础信息、前台叙事字段和 AI 文案辅助，是前后台联动最关键的内容管理页面之一。
            </div>
          </div>
        </div>
      </el-card>

      <el-card>
        <div class="admin-toolbar">
          <el-input
            v-model="filters.keyword"
            class="admin-toolbar__grow"
            placeholder="按景点名称或简介搜索"
            clearable
          />
          <el-input v-model="filters.region" class="admin-toolbar__grow" placeholder="按地区筛选" clearable />
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="openCreateDialog">新建景点</el-button>
        </div>

        <el-table v-loading="loading" :data="tableData" border>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="name" label="景点名称" min-width="160" />
          <el-table-column prop="region" label="地区" width="120" />
          <el-table-column prop="categoryName" label="分类" width="140" />
          <el-table-column prop="recommendFlag" label="推荐" width="90">
            <template #default="{ row }">
              <el-tag :type="row.recommendFlag ? 'danger' : 'info'">
                {{ row.recommendFlag ? '推荐中' : '普通' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-switch :model-value="row.status === 1" @change="(value) => handleStatusChange(row, value)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="admin-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            @current-change="loadTable"
          />
        </div>
      </el-card>

      <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新建景点' : '编辑景点'" width="820px">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
          <el-form-item label="景点名称" prop="name">
            <el-input v-model="form.name" />
          </el-form-item>
          <el-form-item label="所属地区" prop="region">
            <el-input v-model="form.region" />
          </el-form-item>
          <el-form-item label="景点分类" prop="categoryId">
            <el-select v-model="form.categoryId" class="admin-form-control">
              <el-option v-for="item in scenicCategoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="封面图片">
            <div class="admin-form-stack">
              <el-input v-model="form.coverImage" placeholder="/uploads/... 或 /immersive/..." />
              <el-upload
                :action="uploadAction"
                :headers="uploadHeaders"
                :show-file-list="false"
                class="admin-form-stack__action"
                @success="handleCoverUploadSuccess"
                @error="handleUploadError"
              >
                <el-button>上传封面</el-button>
              </el-upload>
            </div>
          </el-form-item>
          <el-form-item label="图集图片">
            <el-input v-model="form.galleryImages" placeholder="多个图片地址请用英文逗号分隔" />
          </el-form-item>
          <el-form-item label="AI 补充说明">
            <div class="admin-form-stack">
              <el-input
                v-model="form.aiNotes"
                type="textarea"
                rows="2"
                maxlength="200"
                show-word-limit
                placeholder="可选：告诉 AI 你希望文案偏向哪些关键词、氛围或受众。"
              />
              <div class="admin-inline-actions admin-form-stack__action">
                <el-button type="primary" plain :loading="aiGenerating" @click="handleGenerateCopywriting">
                  {{ aiGenerating ? '生成中...' : 'AI 生成文案' }}
                </el-button>
                <span v-if="aiModelName" class="admin-muted-text">模型：{{ aiModelName }}</span>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="景点简介">
            <el-input v-model="form.intro" type="textarea" rows="3" />
          </el-form-item>
          <el-form-item label="文化说明">
            <el-input v-model="form.cultureDesc" type="textarea" rows="3" />
          </el-form-item>

          <el-divider content-position="left">前台叙事字段</el-divider>

          <el-form-item label="首图题注">
            <el-input v-model="form.heroCaption" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="路线标签">
            <el-input v-model="form.routeLabel" />
          </el-form-item>
          <el-form-item label="情绪色调">
            <el-select v-model="form.moodTone" class="admin-form-control">
              <el-option v-for="item in moodToneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="引语">
            <el-input v-model="form.quote" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="最佳季节">
            <el-input v-model="form.bestVisitSeason" />
          </el-form-item>
          <el-form-item label="游览方式">
            <el-input v-model="form.visitMode" />
          </el-form-item>
          <el-form-item label="搭配建议">
            <el-input v-model="form.pairingSuggestion" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="最佳光线时段">
            <el-input v-model="form.bestLightTime" />
          </el-form-item>
          <el-form-item label="步行强度">
            <el-input v-model="form.walkingIntensity" />
          </el-form-item>
          <el-form-item label="拍摄点位">
            <el-input v-model="form.photoPoint" />
          </el-form-item>
          <el-form-item label="亲子友好">
            <el-switch v-model="form.familyFriendly" :active-value="1" :inactive-value="0" />
          </el-form-item>

          <el-divider content-position="left">实用信息</el-divider>

          <el-form-item label="开放时间">
            <el-input v-model="form.openTime" />
          </el-form-item>
          <el-form-item label="门票信息">
            <el-input v-model="form.ticketInfo" />
          </el-form-item>
          <el-form-item label="建议停留">
            <el-input v-model="form.suggestedDuration" />
          </el-form-item>
          <el-form-item label="地址">
            <el-input v-model="form.address" />
          </el-form-item>
          <el-form-item label="交通指引">
            <el-input v-model="form.trafficGuide" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="提示信息">
            <el-input v-model="form.tips" type="textarea" rows="2" />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="form.tags" placeholder="多个标签请用英文逗号分隔" />
          </el-form-item>
          <el-form-item label="首页推荐">
            <el-switch v-model="form.recommendFlag" :active-value="1" :inactive-value="0" />
          </el-form-item>
          <el-form-item label="热度分值">
            <el-input-number v-model="form.hotScore" :min="0" />
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </AdminShell>
</template>
