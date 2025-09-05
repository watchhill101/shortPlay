#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI聊天系统Locust压力测试脚本
使用方法：
1. 安装Locust: pip install locust
2. 运行测试: locust -f locust-test.py --host=http://localhost:3000
3. 打开Web界面: http://localhost:8089
"""

import json
import random
import time
from locust import HttpUser, task, between, events
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatAIUser(HttpUser):
    """
    AI聊天用户行为模拟
    """
    wait_time = between(1, 5)  # 用户操作间隔1-5秒
    
    def on_start(self):
        """用户开始测试时的初始化"""
        self.user_id = f"locust_user_{random.randint(1000, 9999)}"
        self.session_id = None
        self.message_count = 0
        
        # 创建聊天会话
        self.create_chat_session()
        
        logger.info(f"用户 {self.user_id} 开始测试")
    
    def create_chat_session(self):
        """创建聊天会话"""
        response = self.client.post("/api/ai/session/create", json={
            "userId": self.user_id,
            "sessionData": {
                "title": "Locust测试会话",
                "platform": "test"
            }
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.session_id = data.get("sessionId")
                logger.info(f"用户 {self.user_id} 创建会话成功: {self.session_id}")
            else:
                logger.error(f"用户 {self.user_id} 创建会话失败: {data}")
        else:
            logger.error(f"用户 {self.user_id} 创建会话HTTP错误: {response.status_code}")
    
    @task(10)
    def send_chat_message(self):
        """发送聊天消息（主要任务，权重10）"""
        if not self.session_id:
            self.create_chat_session()
            return
        
        messages = [
            f"你好，我是用户{self.user_id}",
            "我想了解一下会员服务的详细信息",
            "视频播放时出现卡顿，应该怎么解决？",
            "如何修改我的个人资料？",
            "支付时出现错误，请帮我处理一下",
            "我之前问过的问题，你还记得吗？",
            "能推荐一些热门视频给我吗？",
            "如何联系人工客服？",
            "应用崩溃了，怎么办？",
            "我的账户余额显示不正确"
        ]
        
        self.message_count += 1
        message = f"{random.choice(messages)} (消息#{self.message_count})"
        
        with self.client.post("/api/ai/chat-with-context", 
                             json={
                                 "sessionId": self.session_id,
                                 "userId": self.user_id,
                                 "message": message,
                                 "model": "THUDM/GLM-4-9B-0414",
                                 "contextSize": 10
                             },
                             catch_response=True) as response:
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    response.success()
                    logger.debug(f"用户 {self.user_id} 发送消息成功")
                else:
                    response.failure(f"API返回错误: {data.get('error', 'Unknown error')}")
            else:
                response.failure(f"HTTP错误: {response.status_code}")
    
    @task(3)
    def load_session_messages(self):
        """加载会话历史消息（权重3）"""
        if not self.session_id:
            return
        
        page = random.randint(1, 3)
        
        with self.client.get(f"/api/ai/session/{self.session_id}/messages",
                           params={"page": page, "pageSize": 20},
                           catch_response=True) as response:
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    response.success()
                    logger.debug(f"用户 {self.user_id} 加载历史消息成功")
                else:
                    response.failure(f"加载历史消息失败: {data.get('error')}")
            else:
                response.failure(f"HTTP错误: {response.status_code}")
    
    @task(1)
    def get_session_stats(self):
        """获取会话统计信息（权重1）"""
        if not self.session_id:
            return
        
        with self.client.get(f"/api/ai/session/{self.session_id}/stats",
                           catch_response=True) as response:
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    response.success()
                    logger.debug(f"用户 {self.user_id} 获取统计信息成功")
                else:
                    response.failure(f"获取统计信息失败: {data.get('error')}")
            else:
                response.failure(f"HTTP错误: {response.status_code}")
    
    @task(1)
    def get_user_sessions(self):
        """获取用户所有会话（权重1）"""
        with self.client.get(f"/api/ai/sessions/{self.user_id}",
                           catch_response=True) as response:
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    response.success()
                    logger.debug(f"用户 {self.user_id} 获取会话列表成功")
                else:
                    response.failure(f"获取会话列表失败: {data.get('error')}")
            else:
                response.failure(f"HTTP错误: {response.status_code}")
    
    def on_stop(self):
        """用户停止测试时的清理"""
        logger.info(f"用户 {self.user_id} 结束测试，共发送 {self.message_count} 条消息")

class HighFrequencyUser(HttpUser):
    """
    高频用户：模拟频繁发送消息的用户
    """
    wait_time = between(0.5, 2)  # 更短的等待时间
    weight = 2  # 较高的权重
    
    def on_start(self):
        self.user_id = f"high_freq_user_{random.randint(1000, 9999)}"
        self.session_id = None
        self.message_count = 0
        self.create_chat_session()
    
    def create_chat_session(self):
        response = self.client.post("/api/ai/session/create", json={
            "userId": self.user_id,
            "sessionData": {
                "title": "高频用户会话",
                "platform": "test"
            }
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.session_id = data.get("sessionId")
    
    @task
    def rapid_fire_messages(self):
        """快速连发消息"""
        if not self.session_id:
            return
        
        # 连续发送3条消息
        for i in range(3):
            self.message_count += 1
            message = f"快速消息 #{self.message_count} 来自 {self.user_id}"
            
            self.client.post("/api/ai/chat-with-context", json={
                "sessionId": self.session_id,
                "userId": self.user_id,
                "message": message,
                "model": "THUDM/GLM-4-9B-0414"
            })
            
            time.sleep(0.1)  # 短暂间隔

class LowFrequencyUser(HttpUser):
    """
    低频用户：模拟偶尔使用的用户
    """
    wait_time = between(10, 30)  # 较长的等待时间
    weight = 1  # 较低的权重
    
    def on_start(self):
        self.user_id = f"low_freq_user_{random.randint(1000, 9999)}"
        self.session_id = None
        self.create_chat_session()
    
    def create_chat_session(self):
        response = self.client.post("/api/ai/session/create", json={
            "userId": self.user_id,
            "sessionData": {
                "title": "低频用户会话",
                "platform": "test"
            }
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                self.session_id = data.get("sessionId")
    
    @task
    def occasional_message(self):
        """偶尔发送消息"""
        if not self.session_id:
            return
        
        messages = [
            "我有一个简单的问题",
            "谢谢你的帮助",
            "再见"
        ]
        
        message = random.choice(messages)
        
        self.client.post("/api/ai/chat-with-context", json={
            "sessionId": self.session_id,
            "userId": self.user_id,
            "message": message,
            "model": "THUDM/GLM-4-9B-0414"
        })

# 测试事件监听器
@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """测试开始时的处理"""
    print("🚀 Locust压力测试开始")
    print(f"目标主机: {environment.host}")
    print("=" * 50)

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """测试结束时的处理"""
    print("\n✅ Locust压力测试结束")
    print("=" * 50)
    
    # 输出统计信息
    stats = environment.stats
    print(f"总请求数: {stats.total.num_requests}")
    print(f"失败请求数: {stats.total.num_failures}")
    print(f"平均响应时间: {stats.total.avg_response_time:.2f}ms")
    print(f"最大响应时间: {stats.total.max_response_time:.2f}ms")
    print(f"RPS: {stats.total.current_rps:.2f}")

@events.request_failure.add_listener
def on_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    """请求失败时的处理"""
    logger.error(f"请求失败: {request_type} {name} - {exception}")

# 自定义测试场景
class StressTestScenarios:
    """
    压力测试场景集合
    """
    
    @staticmethod
    def spike_test():
        """峰值测试：短时间内大量用户"""
        return {
            "users": 50,
            "spawn_rate": 10,
            "run_time": "2m"
        }
    
    @staticmethod
    def load_test():
        """负载测试：持续稳定负载"""
        return {
            "users": 20,
            "spawn_rate": 2,
            "run_time": "10m"
        }
    
    @staticmethod
    def endurance_test():
        """耐久测试：长时间稳定负载"""
        return {
            "users": 10,
            "spawn_rate": 1,
            "run_time": "30m"
        }

if __name__ == "__main__":
    print("AI聊天系统Locust压力测试")
    print("使用方法:")
    print("1. 基础测试: locust -f locust-test.py --host=http://localhost:3000")
    print("2. 峰值测试: locust -f locust-test.py --host=http://localhost:3000 -u 50 -r 10 -t 2m")
    print("3. 负载测试: locust -f locust-test.py --host=http://localhost:3000 -u 20 -r 2 -t 10m")
    print("4. 无界面模式: locust -f locust-test.py --host=http://localhost:3000 --headless -u 10 -r 2 -t 5m") 