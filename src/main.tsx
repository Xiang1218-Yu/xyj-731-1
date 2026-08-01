import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

// 应用入口：挂载根组件
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('未找到根节点 #root');
}
ReactDOM.createRoot(rootElement).render(<App />);
