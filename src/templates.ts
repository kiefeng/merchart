import type { DiagramKind } from "./types";

/**
 * 每种图的「完整模板」：一段能直接渲染的 Mermaid 代码。
 *
 * 目的不是好看，是让人改的时候有东西可抄：形状、分组、样式、注释、
 * 关系类型这些都摆出来，需要用时删掉不需要的行，不用回头翻语法文档。
 * 每个模板都要能被渲染，测试里逐个跑过，改语法前先想清楚会不会炸。
 */
export const FULL_TEMPLATES: Record<DiagramKind, string> = {
  /* ------------------------------------------------------------------ */
  flowchart: `flowchart TD
  %% 形状：["矩形"]; 圆角用 ["文字"] 外面再加 ( )；判断用 {"文字"}；圆用 (("文字"))
  subgraph 准备[准备阶段]
    A["收集需求"] --> B{"排期可行？"}
    B -->|"可以"| C["拆解任务"]
    B -->|"不行"| D["调整范围"]
  end
  subgraph 执行[执行阶段]
    C --> E[("里程碑")]
  end
  D --> B
  %% 统一配色：classDef 定义一套，class 挂到节点上
  classDef done fill:#e8f5e9,stroke:#66bb6a,stroke-width:1px
  class E done
  style C fill:#fff3e0,stroke:#fb8c00`,

  /* ------------------------------------------------------------------ */
  mindmap: `mindmap
  root(("知识管理"))
    输入
      阅读
      ::icon(fa fa-book)
      摘录
    整理
      标签
      归档
    输出
      写作
      ((分享))`,

  /* ------------------------------------------------------------------ */
  timeline: `timeline
  title 项目历程
  section 启动
    2025 : 立项
         : 竞品调研
  section 落地
    2026 : 正式上线
         : 首轮复盘`,

  /* ------------------------------------------------------------------ */
  sequence: `sequenceDiagram
  autonumber
  actor U as 用户
  participant S as 服务端
  participant D as 数据库
  U->>S: 提交表单
  activate S
  S->>D: 写入记录
  D-->>S: 确认写入
  alt 校验通过
    S-->>U: 返回结果
  else 校验失败
    S-->>U: 返回错误码
  end
  loop 每 30 秒
    S->>D: 同步进度
  end
  deactivate S
  Note over U,S: 全程目标 200ms 内`,

  /* ------------------------------------------------------------------ */
  class: `classDiagram
  class 订单 {
    +String 编号
    +Decimal 金额
    -String 内部备注
    +提交() bool
    +取消() void
  }
  class 用户 {
    +String 姓名
    +String 邮箱
  }
  class 状态 {
    <<enumeration>>
    草稿
    已完成
  }
  用户 "1" --> "0..*" 订单 : 创建
  订单 ..> 状态 : 使用
  note for 订单 "金额含税"`,

  /* ------------------------------------------------------------------ */
  state: `stateDiagram-v2
  state "待提交" as s1
  state "审核中" as s2
  state "已发布" as s3
  [*] --> s1
  s1 --> s2 : 提交
  s2 --> s3 : 通过
  s2 --> s1 : 退回
  s3 --> [*]
  note right of s2 : 最长 2 个工作日
  state 审核中 {
    [*] --> 初审
    初审 --> 复审 : 通过
  }`,

  /* ------------------------------------------------------------------ */
  er: `erDiagram
  用户 ||--o{ 订单 : 下单
  订单 ||--|{ 明细 : 包含
  商品 ||--o{ 明细 : 被引用
  用户 {
    string 姓名 PK
    string 邮箱 UK
  }
  订单 {
    string 编号 PK
    date 下单日期
    decimal 金额 FK
  }
  明细 {
    string 商品编号 FK
    int 数量
  }`,

  /* ------------------------------------------------------------------ */
  gantt: `gantt
  title 项目排期
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  excludes weekends
  section 设计
  需求梳理 :done, d1, 2026-01-05, 10d
  方案定稿 :active, d2, after d1, 8d
  section 开发
  功能开发 :crit, 20d
  联调上线 :milestone, m1, 2026-03-02, 0d`,

  /* ------------------------------------------------------------------ */
  pie: `pie showData
  title 终端构成
  "桌面端" : 45
  "移动端" : 30
  "平板" : 15
  "其他" : 10`,

  /* ------------------------------------------------------------------ */
  quadrant: `quadrantChart
  title 优先级
  x-axis "低紧急" --> "高紧急"
  y-axis "低重要" --> "高重要"
  quadrant-1 "马上做"
  quadrant-2 "排期做"
  quadrant-3 "不做"
  quadrant-4 "有空做"
  "事项A": [0.82, 0.74]
  "事项B": [0.31, 0.68]
  "事项C": [0.62, 0.36]`,

  /* ------------------------------------------------------------------ */
  journey: `journey
  title 首次使用
  section 进入
    打开首页: 4: 用户
    填写信息: 2: 用户, 客服
  section 使用
    浏览内容: 5: 用户
    导出结果: 3: 用户`,

  /* ------------------------------------------------------------------ */
  kanban: `kanban
  待办
    [整理需求]@{ ticket: MC-1, priority: 'High' }
    [核对数据来源]
  进行中
    [设计初稿]
  已完成
    [项目启动]`,

  /* ------------------------------------------------------------------ */
  treemap: `treemap-beta
"内容分类"
    "教程": 45
    "案例": 25
    "参考": 30`,

  /* ------------------------------------------------------------------ */
  radar: `radar-beta
  title 方案对比
  axis q["质量"]
  axis s["速度"]
  axis c["成本"]
  axis u["易用"]
  curve a["方案甲"]{4, 5, 3, 4}
  curve b["方案乙"]{3, 4, 5, 3}
  max 5
  ticks 5
  showLegend true`,

  /* ------------------------------------------------------------------ */
  sankey: `sankey-beta
  %% 节点名只能是英文、数字、下划线；写中文会自动改成流程图版
  %% 三列：来源、去向、数值；数值决定连线粗细
  visit,signup,60
  visit,bounce,40
  signup,order,45
  signup,churn,15
  order,repeat,12`,

  /* ------------------------------------------------------------------ */
  xychart: `xychart-beta
  %% 柱状用 bar，折线用 line，两行都写就是叠加对比，引号里的名字会进图例
  %% 每行括号里的数字个数要跟 x 轴的类别数一致，多一个少一个都会报错
  %% 数据标签 Mermaid 不支持，数值看纵轴和图例，要精确数字另附表格
  title "季度活跃"
  x-axis ["Q1", "Q2", "Q3", "Q4"]
  y-axis "人数" 0 --> 200
  bar "今年" [40, 85, 130, 175]
  line "去年" [30, 70, 110, 150]`,

  /* ------------------------------------------------------------------ */
  gitgraph: `gitGraph
  commit id: "初始化" tag: "v0.1"
  branch content
  checkout content
  commit id: "起草"
  commit id: "修订" type: HIGHLIGHT
  checkout main
  commit id: "准备合并"
  merge content tag: "v1.0"
  commit id: "定稿"`,

  /* ------------------------------------------------------------------ */
  c4: `C4Context
  title 内容平台
  Person(user, "用户", "内容使用者")
  System(platform, "内容平台", "资料与检索")
  System_Ext(storage, "对象存储", "外部服务")
  System_Ext(mail, "邮件服务", "通知")
  Rel(user, platform, "浏览", "HTTPS")
  Rel(platform, storage, "读取")
  Rel(platform, mail, "发送提醒")
  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")`,

  /* ------------------------------------------------------------------ */
  requirement: `requirementDiagram
  requirement content_review {
    id: 1
    text: "所有发布内容需经审核"
    risk: high
    verifymethod: inspection
  }
  functionalRequirement audit_trail {
    id: 2
    text: "审核动作需留存记录"
    risk: medium
    verifymethod: test
  }
  element review_process {
    type: process
    docRef: "内部规范"
  }
  review_process - satisfies -> content_review
  content_review - derives -> audit_trail`,

  /* ------------------------------------------------------------------ */
  block: `block-beta
  columns 3
  A["立项"] B["设计"] C["开发"]
  block:tests
    columns 2
    D["测试"]
    E["上线"]
  end
  A --> D
  style A fill:#fff3e0`,

  /* ------------------------------------------------------------------ */
  packet: `packet-beta
  title TCP 头
  0-15: "源端口"
  16-31: "目的端口"
  32-63: "序列号"
  64-95: "确认号"
  96-99: "数据偏移"`,

  /* ------------------------------------------------------------------ */
  architecture: `architecture-beta
  group api(cloud)[接口层]
  service db(database)[数据库] in api
  service server(server)[服务] in api
  service disk(disk)[存储]
  service mq[消息队列]
  server:R -- L:db
  server:B -- T:disk
  server:R -- L:mq
  db:B -- T:disk`,
};

export function fullTemplate(kind: DiagramKind): string {
  return FULL_TEMPLATES[kind] ?? "";
}
