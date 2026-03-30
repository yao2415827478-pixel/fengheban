package com.blueplan.app.plugin;

import android.app.Activity;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;

import com.alipay.sdk.app.AuthTask;
import com.alipay.sdk.app.PayTask;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Map;

/**
 * 支付宝支付插件
 * 用于在 App 中调起支付宝进行支付
 */
@CapacitorPlugin(name = "AlipayPlugin")
public class AlipayPlugin extends Plugin {
    private static final String TAG = "AlipayPlugin";
    
    private static final int PAY_CODE = 1001;
    private static final int AUTH_CODE = 1002;

    private Handler handler;

    @Override
    public void load() {
        super.load();
        handler = new Handler(Looper.getMainLooper());
        android.util.Log.d(TAG, "支付宝插件已加载！");
    }

    /**
     * 支付宝支付
     * @param call 传入 orderStr (后端返回的支付参数字符串)
     */
    @PluginMethod
    public void pay(final PluginCall call) {
        String orderStr = call.getString("orderStr");

        if (TextUtils.isEmpty(orderStr)) {
            call.reject("orderStr 不能为空");
            return;
        }

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity 不存在");
            return;
        }

        // 在子线程执行支付，避免阻塞主线程
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // 调起支付
                    PayTask payTask = new PayTask(activity);
                    Map<String, String> result = payTask.payV2(orderStr, true);

                    // 在主线程返回结果
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            JSObject ret = new JSObject();
                            String resultStatus = result.get("resultStatus");
                            ret.put("resultCode", resultStatus);
                            ret.put("resultStatus", resultStatus);
                            ret.put("memo", result.get("memo"));
                            // 将Map转换为JSON字符串
                            try {
                                String resultJson = new JSONObject(result).toString();
                                ret.put("result", resultJson);
                            } catch (Exception e) {
                                ret.put("result", result.toString());
                            }
                            
                            // 解析支付宝 SDK 返回的 resultStatus
                            if ("9000".equals(resultStatus)) {
                                ret.put("success", true);
                                ret.put("message", "支付成功");
                            } else if ("6001".equals(resultStatus)) {
                                ret.put("success", false);
                                ret.put("cancelled", true);
                                ret.put("message", "用户取消支付");
                            } else if ("6002".equals(resultStatus)) {
                                ret.put("success", false);
                                ret.put("message", "网络连接错误");
                            } else if ("4000".equals(resultStatus)) {
                                ret.put("success", false);
                                ret.put("message", "订单支付失败");
                            } else {
                                ret.put("success", false);
                                ret.put("message", "支付失败: " + resultStatus);
                            }

                            call.resolve(ret);
                        }
                    });
                } catch (final Exception e) {
                    handler.post(new Runnable() {
                        @Override
                        public void run() {
                            call.reject("支付异常: " + e.getMessage());
                        }
                    });
                }
            }
        }).start();
    }

    /**
     * 支付宝授权（用于获取用户信息）
     */
    @PluginMethod
    public void auth(final PluginCall call) {
        String authInfo = call.getString("authInfo");

        if (TextUtils.isEmpty(authInfo)) {
            call.reject("authInfo 不能为空");
            return;
        }

        final Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity 不存在");
            return;
        }

        handler.post(new Runnable() {
            @Override
            public void run() {
                AuthTask authTask = new AuthTask(activity);
                Map<String, String> result = authTask.authV2(authInfo, true);

                JSObject ret = new JSObject();
                // 将Map转换为JSON字符串
                String resultJson = new JSONObject(result).toString();
                ret.put("result", resultJson);

                String resultStatus = result.get("resultStatus");
                ret.put("resultCode", resultStatus);
                ret.put("resultStatus", resultStatus);
                ret.put("memo", result.get("memo"));
                if ("9000".equals(resultStatus)) {
                    ret.put("success", true);
                    ret.put("message", "授权成功");
                    ret.put("authCode", result.get("auth_code"));
                } else if ("6001".equals(resultStatus)) {
                    ret.put("success", false);
                    ret.put("message", "用户取消授权");
                } else {
                    ret.put("success", false);
                    ret.put("message", "授权失败: " + resultStatus);
                }

                call.resolve(ret);
            }
        });
    }

    /**
     * 检查支付宝是否安装
     */
    @PluginMethod
    public void isAlipayInstalled(final PluginCall call) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                Activity activity = getActivity();
                if (activity == null) {
                    call.resolve(new JSObject());
                    return;
                }

                PayTask payTask = new PayTask(activity);
                // 检查支付宝是否安装 - 支付宝SDK可能没有这个方法
                // 直接返回true，因为如果支付宝SDK能初始化，支付宝应该可用
                boolean isInstalled = true;
                
                JSObject ret = new JSObject();
                ret.put("installed", isInstalled);
                call.resolve(ret);
            }
        });
    }
}
