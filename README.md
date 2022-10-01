# Calandar4print

用于打印的万年历，不依赖任何外部库。

---

## 使用方法

|               |                |
|:-------------:|:---------------|
|  启动         | npm serve       |
|  编译农历数据  | npm parse       |

## 文件功能

### / (根目录)
| 文件名             |  功能                                 |
|:-----------------:|:--------------------------------------|
| calandar.html     | 入口页面，引入基础逻辑、皮肤、自动刷新    |
| server.js         | Dev Server，为前端提供日历api           |
| festival.js       | 定义节日、纪念日，被server.js引用       |
| script.js         | 前端页面基础逻辑                       |
| build-data.js     | 农历数据编译                           |
| global.d.ts       | 全局类型定义，保持打开可使用类型提示     |

### /skin-* (皮肤)
| 文件名             |  功能                                 |
|:-----------------:|:--------------------------------------|
| main.js           | 皮肤逻辑，生成组件并挂载到页面上         |
| style.css         | 样式表                                 |

### /lib (库)
| 文件名             |  功能                                 |
|:-----------------:|:--------------------------------------|
| auto-refresh.js   | 通过WebSocket接收Dev Server自动刷新指令 |
| utils-frontend.js | 前端重要工具类、工具函数                |
|                   |                                       |
| utils.js          | 前后端共用工具函数                      |
|                   |                                       |
| log.js            | 后端日志函数                           |
| mini-server.js    | 仿express.js的服务器类                 |
| ws.js             | WebSocket通信类                        |
| jsonfile.js       | 后端json读写工具函数                    |


## 数据来源

农历数据来源
- 香港天文台 https://www.hko.gov.hk/sc/gts/time/conversion1_text.htm

休假数据来源
- https://timor.tech/api/holiday


