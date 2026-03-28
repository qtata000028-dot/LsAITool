import { ElMessage } from 'element-plus';

export function useMessage() {
  return {
    error: (message: string) => ElMessage.error(message),
    info: (message: string) => ElMessage.info(message),
    success: (message: string) => ElMessage.success(message),
    warning: (message: string) => ElMessage.warning(message),
  };
}
