import request from './request';

export function getHomeConfigDetailApi() {
  return request({
    url: '/api/admin/home-config/detail',
    method: 'get'
  });
}

export function updateHomeConfigApi(data) {
  return request({
    url: '/api/admin/home-config/update',
    method: 'put',
    data
  });
}
