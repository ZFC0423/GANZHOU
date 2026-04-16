<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import AdminShell from '../../components/AdminShell.vue';
import {
  getAiChatLogsApi,
  getAiCopywritingLogsApi,
  getAiTripLogsApi
} from '../../api/ai-logs';

const activeTab = ref('chat');
const loading = ref(false);
const errorText = ref('');
const detailVisible = ref(false);
const detailRecord = ref(null);
const tableData = ref([]);
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
});

const tabOptions = [
  { label: '问答日志', value: 'chat' },
  { label: '行程日志', value: 'trip' },
  { label: '文案日志', value: 'copywriting' }
];

const requestMap = {
  chat: getAiChatLogsApi,
  trip: getAiTripLogsApi,
  copywriting: getAiCopywritingLogsApi
};

const detailTitle = computed(() => {
  if (!detailRecord.value) {
    return '日志详情';
  }

  if (activeTab.value === 'chat') {
    return `问答日志 #${detailRecord.value.id}`;
  }

  if (activeTab.value === 'trip') {
    return `行程日志 #${detailRecord.value.id}`;
  }

  return `文案日志 #${detailRecord.value.id}`;
});

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

function truncateText(value, maxLength = 60) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return '-';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function stringifyValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return value;
    }
  }

  return JSON.stringify(value, null, 2);
}

function getChatSummary(row) {
  return truncateText(row.question, 80);
}

function getTripSummary(row) {
  const parts = [`${row.days || 0} 天`];

  if (row.preferences) {
    parts.push(String(row.preferences));
  }

  if (row.pace) {
    parts.push(`节奏：${row.pace}`);
  }

  return truncateText(parts.join(' | '), 80);
}

function getCopywritingSummary(row) {
  const parts = [String(row.target_type || '-')];

  if (row.target_id) {
    parts.push(`目标 ID：${row.target_id}`);
  }

  return parts.join(' | ');
}

async function loadLogs() {
  loading.value = true;
  errorText.value = '';

  try {
    const request = requestMap[activeTab.value];
    const response = await request({
      page: pagination.page,
      pageSize: pagination.pageSize
    });

    tableData.value = response.data.list || [];
    pagination.total = response.data.pagination?.total || 0;
    pagination.page = response.data.pagination?.page || pagination.page;
    pagination.pageSize = response.data.pagination?.pageSize || pagination.pageSize;
  } catch (error) {
    tableData.value = [];
    pagination.total = 0;
    errorText.value = error.response?.data?.message || 'AI 日志加载失败';
  } finally {
    loading.value = false;
  }
}

function handleTabChange() {
  pagination.page = 1;
  detailVisible.value = false;
  detailRecord.value = null;
  loadLogs();
}

function handlePageChange(page) {
  pagination.page = page;
  loadLogs();
}

function openDetail(row) {
  detailRecord.value = row;
  detailVisible.value = true;
}

onMounted(loadLogs);
</script>

<template>
  <AdminShell>
    <div class="admin-page admin-page--stack">
      <el-card>
        <div class="admin-page-title">AI 日志查看</div>
        <div class="admin-muted-text">
          统一查看 AI 问答、行程推荐和文案生成的历史记录。这里既能用于答辩演示，也方便你排查 AI 是否真正引用了平台内容。
        </div>
      </el-card>

      <el-card>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange">
          <el-tab-pane v-for="item in tabOptions" :key="item.value" :label="item.label" :name="item.value" />
        </el-tabs>

        <div v-if="errorText" class="admin-alert-wrap">
          <el-alert :title="errorText" type="error" show-icon :closable="false" />
        </div>

        <el-table v-if="tableData.length" v-loading="loading" :data="tableData" border>
          <el-table-column prop="id" label="ID" width="80" />

          <el-table-column v-if="activeTab === 'chat'" label="问题摘要" min-width="260">
            <template #default="{ row }">
              {{ getChatSummary(row) }}
            </template>
          </el-table-column>

          <el-table-column v-if="activeTab === 'trip'" label="行程摘要" min-width="280">
            <template #default="{ row }">
              {{ getTripSummary(row) }}
            </template>
          </el-table-column>

          <el-table-column v-if="activeTab === 'copywriting'" label="目标对象" min-width="220">
            <template #default="{ row }">
              {{ getCopywritingSummary(row) }}
            </template>
          </el-table-column>

          <el-table-column prop="model_name" label="模型" width="160" />
          <el-table-column prop="token_usage" label="Token" width="100" />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty
          v-else-if="!loading"
          :description="errorText ? '日志加载失败，请稍后重试' : '当前暂无日志数据'"
        />

        <div class="admin-pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            layout="total, prev, pager, next"
            :total="pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </el-card>

      <el-dialog v-model="detailVisible" :title="detailTitle" width="860px">
        <template v-if="detailRecord">
          <el-descriptions :column="2" border class="admin-dialog-descriptions">
            <el-descriptions-item label="ID">{{ detailRecord.id }}</el-descriptions-item>
            <el-descriptions-item label="模型">{{ detailRecord.model_name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="Token">{{ detailRecord.token_usage ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailRecord.created_at) }}</el-descriptions-item>
          </el-descriptions>

          <template v-if="activeTab === 'chat'">
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">用户问题</div>
              <pre class="admin-log-pre">{{ detailRecord.question || '-' }}</pre>
            </div>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">AI 回答</div>
              <pre class="admin-log-pre">{{ detailRecord.answer || '-' }}</pre>
            </div>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">命中上下文</div>
              <pre class="admin-log-pre">{{ stringifyValue(detailRecord.matched_context) }}</pre>
            </div>
          </template>

          <template v-else-if="activeTab === 'trip'">
            <el-descriptions :column="2" border class="admin-dialog-descriptions">
              <el-descriptions-item label="天数">{{ detailRecord.days || '-' }}</el-descriptions-item>
              <el-descriptions-item label="节奏">{{ detailRecord.pace || '-' }}</el-descriptions-item>
              <el-descriptions-item label="偏好" :span="2">
                {{ detailRecord.preferences || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="额外要求" :span="2">
                {{ detailRecord.extra_requirement || '-' }}
              </el-descriptions-item>
            </el-descriptions>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">生成结果</div>
              <pre class="admin-log-pre">{{ stringifyValue(detailRecord.result_content) }}</pre>
            </div>
          </template>

          <template v-else>
            <el-descriptions :column="2" border class="admin-dialog-descriptions">
              <el-descriptions-item label="目标类型">{{ detailRecord.target_type || '-' }}</el-descriptions-item>
              <el-descriptions-item label="目标 ID">{{ detailRecord.target_id || '-' }}</el-descriptions-item>
            </el-descriptions>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">输入数据</div>
              <pre class="admin-log-pre">{{ stringifyValue(detailRecord.input_data) }}</pre>
            </div>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">输出结果</div>
              <pre class="admin-log-pre">{{ stringifyValue(detailRecord.output_content) }}</pre>
            </div>
            <div class="admin-detail-section">
              <div class="admin-detail-section__title">Prompt 文本</div>
              <pre class="admin-log-pre">{{ detailRecord.prompt_text || '-' }}</pre>
            </div>
          </template>
        </template>
      </el-dialog>
    </div>
  </AdminShell>
</template>
