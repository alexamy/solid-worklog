/* @refresh reload */
import { render } from 'solid-js/web';
import { App } from './App/index2.tsx';
import './index.css';

const root = document.getElementById('root');

render(() => <App />, root!);
