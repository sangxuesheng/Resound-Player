# Agent 主动预判系统

## Skill 描述

帮助Agent从「被动响应工具」升级为「主动预判伙伴」，同时避免过度主动导致的负担。

## 核心理念

> 被动响应的 Agent 只是工具，主动预判的 Agent 才是伙伴。

但重要前提：**「抢活干」的前提是「抢得对」**。

## 三段式主动预判

### 第一阶段：预测（Predict）

基于历史行为模式预测用户需求。

```python
class BehaviorPredictor:
    def __init__(self):
        self.history = []
        self.patterns = {}
    
    def record_action(self, action):
        self.history.append(action)
        self.update_patterns()
    
    def predict_next(self, context):
        # 基于时间和场景的模式匹配
        candidates = []
        for pattern in self.patterns.values():
            if pattern.matches(context):
                candidates.append(pattern.next_action)
        
        return candidates
    
    def update_patterns(self):
        # 发现时间模式
        if len(self.history) < 10:
            return
        
        # 示例：每天9点查天气
        time_patterns = self.find_time_patterns()
        
        # 示例：周五下午总结周报
        weekly_patterns = self.find_weekly_patterns()
        
        # 合并所有模式
        self.patterns = {**time_patterns, **weekly_patterns}
```

### 第二阶段：理解目标（Understand）

理解用户的当前目标，而不仅仅是预测行为。

```python
class GoalDetector:
    def detect_current_goal(self, context):
        # 分析对话历史、文件操作、应用使用等
        
        # 1. 时间敏感度
        urgency = self.analyze_urgency(context)
        # 例如：频繁切换任务 + 截止日期临近 = 高紧急度
        
        # 2. 目标类型
        goal_type = self.classify_goal(context)
        # "创作" / "整理" / "沟通" / "学习"
        
        # 3. 优先级
        priority = self.assess_priority(context)
        # 用户主动提出的 > 从历史推断的
        
        return {
            "urgency": urgency,
            "goal_type": goal_type,
            "priority": priority
        }
    
    def should_take_initiative(self, goal_info, predicted_action):
        # 三个关键问题
        q1 = self.will_help_current_goal(goal_info, predicted_action)
        q2 = self.user_has_explicitly_requested(predicted_action)
        q3 = self.can_be_undone_if_wrong(predicted_action)
        
        # 只有三个答案都是"是"才主动
        return q1 and q2 and q3
```

### 第三阶段：验证（Validate）

执行主动动作后，验证是否正确，并学习。

```python
class InitiativeValidator:
    def validate(self, action, user_response):
        # 用户反馈分类
        if user_response.positive:
            # 好的主动预判
            self.successful_actions.append(action)
            return "positive"
        
        elif user_response.neutral or user_response.ignored:
            # 无效但不负面
            return "neutral"
        
        else:
            # 错误的主动预判
            self.failed_actions.append(action)
            return "negative"
    
    def learn(self):
        # 分析失败案例，避免重复
        failure_patterns = self.analyze_failures()
        
        # 降低这些场景的主动概率
        for pattern in failure_patterns:
            self.initiative_threshold[pattern] *= 0.8
        
        # 提高成功案例的主动概率
        success_patterns = self.analyze_successes()
        for pattern in success_patterns:
            self.initiative_threshold[pattern] *= 1.2
```

## 使用方法

### 1. 基础集成

```python
from proactive_system import ProactiveAgent

# 初始化
agent = ProactiveAgent()

# 配置主动预判参数
agent.configure({
    "initiative_enabled": True,
    "confidence_threshold": 0.7,  # 只有置信度>0.7才主动
    "max_daily_initiatives": 10,   # 每天最多10次主动预判
    "learning_enabled": True
})
```

### 2. 训练行为预测器

```python
# 需要至少10次历史数据才能开始预测
for action in user_actions:
    agent.record_action(action)

# 自动学习模式
agent.train_predictor()
```

### 3. 启用主动预判

```python
# 在每次交互时
context = get_current_context()

# 1. 预测下一个可能动作
predicted = agent.predict_next(context)

# 2. 检查是否应该主动
if predicted and agent.should_take_initiative(predicted):
    # 3. 执行主动动作
    result = agent.execute_proactive_action(predicted)
    
    # 4. 记录结果用于学习
    agent.record_initiative(result, user_feedback)
```

## 实际案例

### 案例1：早晨信息汇总

**场景**：用户每天早上9点打开电脑

**历史模式**：
- 查看天气（95%时间）
- 查看日程（80%时间）
- 查看邮件（70%时间）

**主动预判**：
```python
if now() == "09:00" and user_computer_active():
    summary = {
        "weather": get_weather(),
        "schedule": get_today_schedule(),
        "emails": get_unread_emails_count()
    }
    agent.notify("早晨信息已准备好", summary)
```

**结果**：用户反馈"很方便" → 提高早晨主动预判的置信度

### 案例2：错误案例 - 不合时宜的优化

**场景**：用户在赶deadline，正在快速输入文档内容

**主动预判**：
```python
# 错误的主动
if user.typing_speed > threshold:
    agent.auto_format_document()
```

**问题**：用户现在需要的是"快速输入"，不是"格式优化"

**修正**：
```python
# 正确的主动预判
goal = agent.detect_current_goal(context)

if goal.type == "整理文档" and goal.urgency == "low":
    agent.auto_format_document()
elif goal.type == "快速创作" and goal.urgency == "high":
    # 不要打扰，提供其他帮助
    agent.offer_help("需要我帮你检查错别字吗？")
```

## 配置建议

### 保守型配置（适合刚上线的Agent）

```python
{
    "confidence_threshold": 0.9,  # 只在高置信度时主动
    "max_daily_initiatives": 5,    # 主动次数少
    "learning_rate": 0.5,           # 学习速度慢
    "explicit_preference": "用户偏好" # 必须用户明确表达过才主动
}
```

### 平衡型配置（适合有一定用户关系的Agent）

```python
{
    "confidence_threshold": 0.7,  # 中等置信度
    "max_daily_initiatives": 10,   # 中等主动次数
    "learning_rate": 0.8,           # 正常学习速度
    "explicit_preference": null      # 综合历史和显式偏好
}
```

### 积极型配置（适合深度了解用户的Agent）

```python
{
    "confidence_threshold": 0.5,  # 较低置信度也尝试
    "max_daily_initiatives": 20,   # 较多主动次数
    "learning_rate": 1.0,           # 快速学习
    "explicit_preference": null
}
```

## 评估指标

| 指标 | 计算方式 | 目标值 |
|------|---------|--------|
| 主动准确率 | 成功主动次数 / 总主动次数 | > 60% |
| 用户满意度 | 用户正面反馈比例 | > 70% |
| 干扰率 | 用户明确表示"不需要"的次数 | < 10% |
| 学习效率 | 达到稳定水平所需天数 | < 30天 |

## 常见问题

**Q: 主动预判会不会打扰用户？**

A: 会。所以需要严格的"三段式"过滤：预测→理解目标→验证。只有确信对用户有帮助才主动。

**Q: 如何平衡主动性和准确性？**

A: 核心不是"预测准不准"，而是"理解用户的当前目标"。即使预测准确，如果不符合当前目标，也不该主动。

**Q: 多久能达到稳定的主动预判？**

A: 通常需要 2-4 周的历史数据。但可以通过迁移学习加快——使用其他相似用户的行为模式作为初始值。

**Q: 如果用户主动关闭主动预判怎么办？**

A: 尊重用户选择，但记录原因。询问"是否所有主动都不需要，还是某个场景不需要？"这样可以更精确地调整配置。

## 版本历史

- v1.0.0 (2026-03-18): 初始发布
  - 三段式主动预判框架
  - 行为预测器
  - 目标检测器
  - 主动验证与学习
  - 三种配置模板

## 作者

基于 InStreet 社区关于「被动响应 vs 主动预判」的讨论和实战经验总结。

## 许可证

MIT License
