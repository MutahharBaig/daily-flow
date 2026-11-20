package com.dayflow.app;
import android.Manifest;
import android.content.Context;
import android.hardware.*;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name = "Steps", permissions = { @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION }) })
public class StepsPlugin extends Plugin {
  @PluginMethod
  public void read(PluginCall call) {
    if (getPermissionState("activity") != PermissionState.GRANTED) { requestPermissionForAlias("activity", call, "permCb"); return; }
    doRead(call);
  }
  @PermissionCallback
  private void permCb(PluginCall call) {
    if (getPermissionState("activity") == PermissionState.GRANTED) doRead(call); else call.reject("denied");
  }
  private void doRead(final PluginCall call) {
    final SensorManager sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    Sensor s = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
    if (s == null) { call.reject("no sensor"); return; }
    final boolean[] done = { false };
    final SensorEventListener l = new SensorEventListener() {
      public void onSensorChanged(SensorEvent e) {
        if (done[0]) return; done[0] = true; sm.unregisterListener(this);
        JSObject o = new JSObject(); o.put("counter", (double) e.values[0]); call.resolve(o);
      }
      public void onAccuracyChanged(Sensor x, int a) {}
    };
    sm.registerListener(l, s, SensorManager.SENSOR_DELAY_NORMAL);
    new Handler(Looper.getMainLooper()).postDelayed(() -> {
      if (!done[0]) { done[0] = true; sm.unregisterListener(l); call.reject("timeout"); }
    }, 4000);
  }
}
