import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

import App from './App.vue';
import Dialog from './components/base/Dialog.vue';
import DictTag from './components/base/DictTag.vue';
import Icon from './components/base/Icon.vue';
import './styles/iconfont.css';

const app = createApp(App);

app.use(ElementPlus);
app.component('Dialog', Dialog);
app.component('Icon', Icon);
app.component('DictTag', DictTag);
app.component('dict-tag', DictTag);
app.directive('mountedFocus', {
  mounted(el) {
    queueMicrotask(() => {
      if (el instanceof HTMLElement && typeof el.focus === 'function') {
        el.focus();
      }
    });
  },
});

app.mount('#app');
