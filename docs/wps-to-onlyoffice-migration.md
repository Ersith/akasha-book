# WPS → ONLYOFFICE 迁移记录（2026-10-11）

> 起因：WPS 的「轻办公」云组件**禁用服务也杀不掉**（厂商看门狗自动复活、自动登录云账号、监听所有接口）。用户裁定：**卸载 WPS，换 ONLYOFFICE Desktop Editors**。
> 结局：**✓ 迁移完成**（OnlyOffice 已装 + 5 个关联全切 + WPS 已卸干净 + 残留只搬不删 + 验收通过）。

## 一、为什么换（证据链）

| 现象 | 证据 |
|---|---|
| 云同步组件**杀不死** | 杀掉 `wpscloudsvr` 后**数秒内出现新 pid**，命令行 `… /qingbangong /start_from=qingnse autologin`（= 轻办公组件自动登录云账号） |
| 复活渠道 | 两个 WPS 更新计划任务（`ksolaunch.exe /wpsupdate`，登录触发 + 定时触发）；父进程"拉起即退"型守护 |
| 用户不使用云文档 | 用户确认"日常不用"；且其默认办公软件身份让"只关云"难以彻底 |

## 二、迁移步骤（实际执行）

1. **装替代品**（先有新的，再拆旧的，避免"打不开"窗口）：
   `winget install --id ONLYOFFICE.DesktopEditors` → **9.4.0.129**（官方 GitHub 包、winget 校验哈希、`C:\Program Files\ONLYOFFICE\DesktopEditors\`，1.24 GB）
2. **切文件关联**（Windows 禁止程序代设，必须用户点）：
   - `.docx` / `.pdf` / `.doc` 直接可在设置页选到 → `ASC.Document.12` / `ASC.Pdf` / `ASC.Document.1`；
   - `.xlsx` / `.pptx` **搜不到 OnlyOffice** ⇒ 查明原因：**OnlyOffice 早已注册**（`ASC.Sheet.12` / `ASC.Show.12`，类型名「Office Open XML 电子表格/演示文稿」），**只是没被登记进这两个扩展名的候选清单**（那边只有 WPS 的 `ET.Xlsx.6` / `WPP.PPTX.6`）。
   - 修法：把 `ASC.Sheet.12` / `ASC.Show.12` 写进 `HKCU\…\FileExts\.{xlsx,pptx}\OpenWithProgids`（**写入前已 `reg export` 备份**到 `_rollback-20261011-fileassoc\`）⇒ 设置页立刻可选 ✓
3. **建回滚点**（提权）：`tools/create-restore-point.ps1 -Create` ⇒ `[OK] restore point created: before-wps-uninstall-20261011` ✓
4. **卸载 WPS**：跑它自带卸载器（`uninst.exe`，卸载向导），用户点完 → 卸载器**自己**清掉了两个更新任务与机器级目录 ✓
5. **清僵尸 + 归档**：见下"教训"；最终 `tools/wps-post-uninstall.ps1 -Apply` 把残留**只搬不删**进 `H:\Harness\_rollback-20261011-025158-wps\`（`Local-Kingsoft` 205.4 MB + `Roaming-Kingsoft` 60 MB）

## 三、验收（实测）

| 项 | 结果 |
|---|---|
| 5 个关联 | `.docx/.xlsx/.pptx/.pdf/.doc` **全部 → OnlyOffice** ✓ |
| 实际打开 | **docx ✓**（`document-conversion.docx`）· **41 MB PDF ✓**（《原子之心》设定集）· **xlsx ✓**（`combined.xlsx`，窗口标题 `combined.xlsx - ONLYOFFICE`） |
| WPS 痕迹 | **无**：注册表卸载项消失 · **0 个进程** · 无服务 · 无计划任务 · `Program Files\Kingsoft` 已删 · **3061 端口消失** ✓ |

## 四、踩到的四个坑（都已修 / 已记）

1. **厂商看门狗**：禁用服务 ≠ 停掉能力（见上）。**正解＝换掉它或网络层阻断**。
2. **验收方法错了会误判**：`DesktopEditors.exe` 是**启动器/单例转发壳**（把活交给真身后**自己以退出码 0 退出**）；真身进程名是 **`editors`**（+ `editors_helper`）。⇒ **按"窗口标题"验收，别按"进程名/退出码"**。
3. **按进程名过滤会漏**：卸载器留下 `photolaunch` / `promecefpluginhost` 等**名字里没有 wps** 的僵尸，还让 **explorer 加载着 `qingnse64.dll`**（shell 扩展）。⇒ 判据应是"**进程加载了 WPS 目录模块**"（脚本已改成这个判据）。
4. **我的两个操作失误（如实）**：① 用"按模块路径杀进程"时**误杀了 `explorer.exe`**（Windows 已自动重启外壳，无实际损失，但这是不该做的动作——正确做法是提示用户重启 explorer 或直接重启机器）；② 归档脚本早期版本把两个来源目录都映射成同一个 `Kingsoft` 名字 ⇒ **同名混装**（已修为 `Local-Kingsoft` / `Roaming-Kingsoft`；早期那份 132.7 MB 的部分归档仍在 `_rollback-20261011-025000-wps\`，仅缓存/配置，可留可删）。

## 五、遗留事项

1. ~~**卷影存储偏小**~~ **→ 已解决（2026-10-11）**：`tools/enlarge-shadow-storage.ps1 -Apply` 执行 `vssadmin resize shadowstorage` ⇒ **C: 卷影上限 4.00 GB (1%) → 24.0 GB (10%)**，其它卷本来就是 10%（报告 `docs/shadowstorage-20261011-025443.txt`）。
   - 自查记录：该脚本第一版有**两处"语言假设"缺陷**（中文正则 + 按英文 `Shadow Copy ID` 计数），违反我们"`.ps1` 纯 ASCII"的规矩；已改为**语言无关写法**（按数字/单位匹配；还原点/卷影改用 CIM `Win32_ShadowCopy` 与 `root\default:SystemRestore` 查询）。
   - **未决**：`before-wps-uninstall-20261011` 这个还原点**是否仍在**，非提权无法确认（`Get-ComputerRestorePoint` / `vssadmin` 都要管理员；System 日志里没有对应事件源）。因**迁移已验收完成**，它的安全网作用已兑现；要确认就跑一次 `tools/enlarge-shadow-storage.ps1`（**不带 `-Apply`，纯只读**）。
2. **归档保留期**：`_rollback-*wps*` 两个目录（合计 ~400 MB）**观察一段时间后再决定删**（按我们的"只搬不删"惯例）。
3. **回滚路径**（若哪天想退回 WPS）：重装 WPS + 从 `_rollback-20261011-fileassoc\*.reg` 恢复两个候选键（关联仍由用户在设置页点选）。
