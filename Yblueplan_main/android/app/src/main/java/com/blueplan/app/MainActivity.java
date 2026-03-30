package com.blueplan.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.blueplan.app.plugin.AlipayPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 在 Bridge 初始化完成后注册插件
        getBridge().registerPlugin(AlipayPlugin.class);
        
        Log.d(TAG, "支付宝插件注册成功！");
    }
}
