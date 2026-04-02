## 2026-04-01 In This Repo, Favor Antd Controls Over Antd Card When JSX Types Start Fighting
- This repo's current `antd` setup accepted `Table`, `Tabs`, `Button`, `Flex`, `Tag`, `Empty`, and `Typography` cleanly, but `Card` became unstable under type checking in the module-setting workspace and triggered `TS2604` as a JSX element.
- When the product goal is "make the visible controls feel uniformly Antd," do not get stuck forcing every shell layer to become `Card`. It is acceptable to keep a plain container div and move the visible controls onto Antd components first, especially when that lets lint/build stay green.
- Treat this as a delivery rule for this codebase: prioritize the user's visible consistency target and compile stability over full component-purity if one specific Antd shell component proves unreliable in the current toolchain.
# 浠诲姟鏁欒

## 2026-03-28 AI Batch Actions Should Reuse The Real Page Save Instead Of Inventing Narrow Follow-Up Saves
- When the user says an AI-assisted batch action like 鈥滀竴閿炕璇戔€?should 鈥渟ave this page鈥? wire that action into the existing page-level save orchestration instead of inventing a special-case save that only persists one field such as the table name.
- In this single-table module-settings flow, the authoritative save entry is `saveSingleTableModuleSettingsPage`; any follow-up save from the grid inspector should call that shared page save so master config, columns, conditions, menus, and related state stay consistent.
- Treat translation and save as two distinct outcomes. If translation succeeds but page save fails, surface that partial-success state explicitly instead of showing a generic full-success toast.
- Do not short-circuit the page save just because the AI translation step found zero acceptable replacements. If the product says 鈥渃licking the button should also save this page鈥? the save path still needs to run for 鈥渘o translatable fields鈥?and 鈥渁ll results filtered out鈥?branches, or the user will see no save request at all.
- When a grid save body is built from editable column state, prefer the screen鈥檚 canonical editable fields like `sourceField` and `name` over stale mirror fields such as `fieldName` and `displayName`. Otherwise the request body can keep posting the old values and make detail-column edits look like they were never saved.
- For the single-table main-field inspector, the 鈥滃瓧娈垫爣璇嗏€?input should map to backend `fieldname` itself, not 鈥渂est effort鈥?fallbacks. If `fieldname` is empty, show empty; do not let `sysname` or `fieldKey` fill the gap and turn an unconfigured identifier into a UUID-like internal key on screen.
- When `fieldname` is editable through `sourceField`, save logic must also respect an explicit empty string. If the UI clears the identifier, do not fall back to stale `fieldname/sysname` values during save or the bug will come back immediately after reload.
- Detail `grid-fields` cannot blindly reuse the main-field mapper鈥檚 display-name rules. For `GET /details/{detailId}/grid-fields`, the visible field title belongs to backend `username`, while the identifier belongs to `fieldName`; if read mapping lets `fieldName` outrank `username`, the UI will show the wrong label even though both values are present.
- When saving detail or field grid columns, send the normalized title and identifier back under the backend aliases that these legacy endpoints actually understand. In this repo, carrying `username` together with `displayName`, and `fieldName` together with `fieldname`, is safer than assuming one alias family covers every grid-field endpoint.

## 2026-03-28 Follow-Up Saves After AI Create Must Respect The Exact Persistence Scope
- When the user narrows a follow-up save rule from 鈥渟ave the generated config鈥?to 鈥渟ave only the table name鈥? do not keep posting the broader payload through a shared adapter by accident. Re-check both the caller payload and the adapter鈥檚 fallback rules.
- In this single-table flow, AI one-click table creation may still update local `mainSql`, but its follow-up module-config save should omit SQL entirely when the requirement is 鈥渙nly persist the table name鈥?
- If the user still sees the generated SQL after the follow-up save payload is already narrowed, inspect local state writes next. In this screen, `updateGridConfig({ mainSql: response.result.mainSql })` was enough to make the UI and the later normal save path keep treating the AI result as persisted SQL.

## 2026-03-28 Single-Table Main Config Screens Must Load And Save The Master Config Row Explicitly
- If a module-settings screen shows main-table metadata like table name or main SQL, do not assume loading the field list, conditions, menus, and colors is enough. The master row still lives in `p_systemdlltab`, and the screen must explicitly fetch/save that row as part of its own lifecycle.
- For this single-table flow, normalize the legacy `p_systemdlltab` field names at the adapter boundary, not in scattered UI code: `DllCoid -> dllCoId`, `ToolsName -> moduleName`, `SQL -> querySql/mainSql`, `SQLDT1 -> mainTable/tableName`, and `condKey -> conditionKey`.
- Do not invent mappings for UI fields that have no confirmed backend column. `defaultQuery`, `sqlPrompt`, and `tableType` should stay on their real contracts instead of being force-fit onto unrelated legacy fields like `condKey`.

## 2026-03-28 Server-Side Create Flows Must Persist Their Authoritative Module Config In The Same Success Path
- If a button creates backend resources that define the canonical module config, like AI one-click table creation producing the final `tableName` and `mainSql`, do not stop at updating local React state. Persist the matching module-config row in the same success branch or the next reload will drift back to stale backend values.
- Keep the follow-up save aligned with the existing read contract. In this single-table module flow, the authoritative config keys are `mainTable` and `querySql`, so the post-create save should write those exact keys instead of inventing UI-only names such as `tableName`.

## 2026-03-23 Document Split, Resize Smoothness And Archive Group Layout
- 鏂囨。宸ヤ綔鍙伴噷涓昏〃鍜屾槑缁嗗鏋滈兘鏄珮棰戞搷浣滃尯锛屽氨涓嶈缁х画淇濈暀鍙嫋鍒嗛殧鏉★紱榛樿搴旀寜绋冲畾姣斾緥鐢氳嚦绛夊垎楂樺害灞曠ず锛岄伩鍏嶇敤鎴蜂竴鐐瑰嚮涓嬪崐鍖哄氨鎰熻甯冨眬鍦ㄧ缉鍔ㄣ€?- 瀵归珮棰戞嫋瀹芥帶浠讹紝涓嶈兘涓€澶勭敤鐩存帴 setState 姣忓抚鍒锋柊銆佸彟涓€澶勫啀鍗曠嫭瀹炵幇涓存椂棰勮锛涘簲缁熶竴鎴愬悓涓€濂?live preview + rAF 鎻愪氦閾捐矾锛屽惁鍒欎綋鎰熶細鏄庢樉涓嶄竴鑷淬€?- 褰撶敤鎴锋槑纭渶瑕佲€滄嫋瀹芥椂鏈夊榻愬埢搴︹€濇椂锛屼笉瑕佸彧鏄剧ず褰撳墠鍍忕礌 HUD锛岃鎶婂彲鍚搁檮瀹藉害鍜屽埢搴﹀弽棣堜竴璧风粰鍑烘潵锛屽府鍔╁井璋冦€?- 鍩虹妗ｆ涓昏〃璇︽儏甯冨眬濡傛灉宸茬粡鏈夆€滃垎缁勨€濊涔夛紝灏变笉瑕佸啀鍋滅暀鍦ㄥぇ鍧楀垎缁勫崱鍫嗗彔锛涘簲鍗囩骇涓轰富浠庡伐浣滃彴锛岃鐢ㄦ埛鍏堥€夊垎缁勶紝鍐嶉厤缃鍒嗙粍鍐呴儴琛屾暟鍜屽瓧娈垫帓甯冦€?
## 2026-03-23 鏄庣粏绫诲瀷鍏ュ彛涓庤〃鏍煎紡鏄庣粏鑳藉姏
- 鏄庣粏绫诲瀷鍒囨崲蹇呴』鍐呰仛鍒版槑缁嗛〉绛惧彸渚э紝涓嶈鍐嶄繚鐣欏簳閮ㄧ嫭绔嬬被鍨嬫爮銆傞〉绛捐礋璐ｅ畾涔夊綋鍓嶆槑缁嗙殑鍐呴儴瑙嗗浘绫诲瀷锛屽伐浣滈潰鍙寜杩欎釜绫诲瀷娓叉煋銆?- 琛ㄦ牸寮忔槑缁嗘暣琛ㄨ兘鍔涘繀椤诲拰涓昏〃淇濇寔鍚岀骇锛岃嚦灏戣淇濈暀鏁磋〃銆佸竷灞€銆佸彸閿€侀鑹茶繖绫婚珮棰戝叆鍙ｏ紝涓嶈兘鍥犱负鏄槑缁嗗氨闄嶆垚瑁佸壀鐗堟鏌ュ櫒銆?- 楠岃瘉杩欑被鏀瑰姩鏃朵笉鑳藉彧鐪嬪彸渚ц〃鍗曟湁娌℃湁鍑虹幇锛岃繕瑕佺湡瀹炲垏涓€娆＄被鍨嬶紝纭涓棿宸ヤ綔闈㈠悓姝ュ垏鎹紝涓旀棫鐨勫簳閮ㄧ被鍨嬪垏鎹㈡潯宸茬粡娑堝け銆?
## 浼氳瘽鍚姩鍓嶆鏌?- 寮€濮嬫湰椤圭洰鐨勫鏉備换鍔″墠锛屽厛闃呰鏈枃浠躲€?- 濡傛灉鐢ㄦ埛鍒氱粰鍑轰慨姝ｆ剰瑙侊紝鍏堟洿鏂版湰鏂囦欢锛屽啀缁х画鎵ц銆?
## 褰撳墠娌夋穩瑙勫垯

### 瑙勫垝涓庢墽琛?- 闈炵畝鍗曚换鍔″繀椤诲厛瑙勫垝锛岃鍒掗渶瑕佽鐩栧疄鐜颁笌楠岃瘉锛岃€屼笉鏄彧鍒楀姛鑳芥楠ゃ€?- 鎵ц涓鏋滃彂鐜版柟妗堝亸绂汇€佷笂涓嬫枃鍙樺寲鎴栭獙璇佷笉鎴愮珛锛屽厛鍋滀笅骞堕噸瑙勫垝銆?- 闇€姹傝鏍艰鎻愬墠鍐欑粏锛岄伩鍏嶉潬瀹炵幇杩囩▼涓存椂鐚滄祴銆?
### 涓婁笅鏂囦笌骞惰
- 璋冪爺銆佹帰绱€佸苟琛屽垎鏋愮被宸ヤ綔瑕佸敖閲忎笌涓诲疄鐜拌В鑰︼紝淇濇寔涓讳笂涓嬫枃骞插噣銆?- 鍗曚釜鍒嗘瀽鍗曞厓鍙鐞嗕竴涓棶棰橈紝閬垮厤娣锋潅澶氫釜鐩爣銆?
### 璐ㄩ噺涓庨獙璇?- 鏈瘉鏄庡彲杩愯鍓嶏紝涓嶈兘澹扮О瀹屾垚銆?- 蹇呴』浠ユ祴璇曘€佹瀯寤恒€佹棩蹇椼€佹祻瑙堝櫒楠岃瘉鎴栬涓哄姣旇瘉鏄庣粨璁恒€?- 鑻ュ瓨鍦ㄦ湭楠岃瘉椤癸紝蹇呴』鏄庣‘璁板綍椋庨櫓锛屼笉鑳界渷鐣ャ€?
### 鑷垜浼樺寲
- 鐢ㄦ埛鐨勬瘡涓€娆′慨姝ｉ兘搴旇浆鍖栦负鏄庣‘瑙勫垯锛屽啓鍏ユ湰鏂囦欢锛岄槻姝㈤噸澶嶇姱閿欍€?- 瀵瑰凡鏈夋暀璁鎸佺画杩唬锛岃€屼笉鏄竴娆℃€ц褰曞悗澶辨晥銆?
### 瀹炵幇椋庢牸
- 鍏堣拷姹傛牴鍥犱慨澶嶏紝鍐嶈€冭檻鏈€灏忎镜鍏ュ疄鐜般€?- 瀵归潪绠€鍗曟敼鍔紝浼樺厛瀵绘壘鏇寸粺涓€銆佹洿浼橀泤鐨勬柟妗堬紝閬垮厤涓存椂鎷艰ˉ銆?
## 鏇存柊璁板綍

### 2026-03-22 鏄庣粏椤电涓庡唴閮ㄨ鍥惧垎灞?- 鏄庣粏椤电鍜屾槑缁嗗唴閮ㄨ鍥句笉鑳介噸澶嶆壙杞藉悓涓€鎵归厤缃€傞〉绛惧彧璐熻矗椤电绾у畾涔夛紝琛ㄦ牸/鍥捐〃/缃戦〉绛夊唴閮ㄨ鍥捐閫氳繃鐐瑰嚮瀵瑰簲鐢诲竷瀵硅薄杩涘叆鍚勮嚜璇︽儏锛屽惁鍒欑敤鎴蜂細鍦ㄤ袱濂楀彸渚ц〃鍗曢噷鏉ュ洖鎵惧悓涓€涓厤缃€?- 褰撶敤鎴锋槑纭寚鍑衡€滃浘琛ㄥ簲璇ョ偣鍑昏鍥鹃鐣欏尯灞曠ず閰嶇疆鈥濇椂锛屼笉瑕佸彧闈犲簳閮ㄧ被鍨嬪垏鎹㈡帹鏂綋鍓嶉厤缃璞★紱蹇呴』璁╃敾甯冨璞℃湰韬垚涓鸿鎯呭叆鍙ｏ紝鍋氬埌鐐瑰嚮瀵硅薄鍗冲垏鎹㈠埌瀵瑰簲妫€鏌ュ櫒銆?- 鍥捐〃绫婚珮棰戦厤缃鏋滃瓧娈靛锛屼笉鑳界畝鍗曞钩閾烘垚瀵嗛泦鐨勫皬鏍煎瓙锛涘簲鎸夆€滃熀纭€淇℃伅 / 杞村瓧娈?/ 棰滆壊 / 寮€鍏斥€濆垎缁勶紝浼樺厛淇濊瘉鎵弿鍜屽～鍐欓『鎵嬨€?
### 2026-03-22 鏄庣粏妫€鏌ュ櫒甯冨眬
- 褰撶敤鎴锋槑纭寚鍑衡€滃彸渚ц鎯呮帓鐗堝お涔扁€濇椂锛屼笉瑕佺户缁湪鐜版湁缁撴瀯涓婂彔鍔犲皬鍗＄墖銆佸皬缁熻鍧楀拰澶氬眰鍏ュ彛锛涘簲閫€鍥炲埌鏇村皯瀹瑰櫒銆佹洿娓呮櫚鍒嗙粍鐨勮〃鍗曢鏋躲€?- 瀵瑰悓涓€宸ヤ綔闈㈤噷鐨勨€滄槑缁嗘ā鍧楀畾涔夆€濆拰鈥滄槑缁嗚〃鏍奸厤缃€濓紝鍗充娇璇箟涓嶅悓锛屼篃瑕佸叡浜粺涓€鐨勮瑙夎妭濂忥紱涓嶈兘涓€杈规槸纰庢憳瑕佸崱锛屼竴杈规槸瀵嗛泦宓屽鍏ュ彛锛屽惁鍒欑敤鎴蜂細鐩存帴鎰熺煡鎴愭潅涔便€?- 楂橀閰嶇疆闈㈡澘閲岋紝浣庝环鍊肩殑璁℃暟鍗°€佽〃鍚嶅崱銆佽鏄庢枃妗堝拰鎶€鏈槧灏勬彁绀哄簲浼樺厛鍒犲噺鎴栧苟鍏ユ爣棰?娆＄骇淇℃伅锛屼笉鑳借瀹冧滑鎶㈠崰濉啓鍖虹殑涓诲眰绾с€?
### 2026-03-22 鏄庣粏鍥捐〃閰嶇疆鍙ｅ緞
- 褰撶敤鎴锋槑纭寚鍚戞煇寮犲巻鍙查厤缃〃锛屽 `p_systemdlltabchart`锛屼笉鑳藉彧鍦ㄥ彸渚ф斁涓€涓€滆惤鐐规槧灏勫崱鈥濇垨琛ㄥ悕鎻愮ず锛涘繀椤绘寜杩欏紶琛ㄧ殑瀛楁鍙ｅ緞鎶婄湡姝ｅ彲缂栬緫鐨勯厤缃垎鏀ˉ鍑烘潵锛屽惁鍒欑敤鎴风湅鍒扮殑浠嶇劧鍙槸鍗婃垚鍝併€?- 瀵硅繖绫烩€滄棫 WinForm 琛ㄦ牸閰嶇疆 -> 鏂板伐浣滃彴妫€鏌ュ櫒鈥濈殑杩佺Щ锛屼紭鍏堜繚鐣欏瓧娈佃涔夊拰楂橀濉啓椤哄簭锛屽啀鍋?shadcn/workbench 鍖栵紝涓嶈鍏堝仛涓€灞傚ソ鐪嬬殑鎽樿鍗″氨鍋滀笅銆?
### 2026-03-22 鏄庣粏閰嶇疆鑱岃矗杈圭晫
- 褰撶敤鎴疯鈥滃垰鎵嶇殑鏄庣粏寮勯敊浜嗭紝鎷胯繖浜涢厤缃幓鏀光€濇椂锛屼紭鍏堝洖鏌ヨ嚜宸辨槸涓嶆槸鎶娾€滄槑缁嗘ā鍧楀畾涔夆€濆拰鈥滄槑缁嗘暣琛ㄩ厤缃€濇媶鎴愪簡涓ゅ骞惰妯″瀷锛涜繖绫婚珮棰戦厤缃繀椤绘敹鍙ｆ垚涓€濂椾富妯″瀷锛屼笉鑳借鐢ㄦ埛鍦ㄤ袱涓彸渚ц鎯呴噷鏉ュ洖鎵俱€?- 鍩虹妗ｆ涓嬬殑鏄庣粏琛ㄦ牸濡傛灉瑕佲€滃拰涓昏〃涓€鏍凤紝鍙槸鏉ユ簮涓嶅悓鈥濓紝姝ｇ‘鍋氭硶鏄鐢ㄤ富琛ㄦ暣琛ㄩ厤缃娉曪紝鍐嶆妸鈥滄ā鍧楃紪鍙风户鎵夸富琛ㄩ厤缃?/ SQL 鑷姩鏋勫垪鈥濅綔涓烘潵婧愬寮鸿鍒欙紝鑰屼笉鏄啀閫犱竴濂楁槑缁嗕笓灞炶〃鍗曘€?- 褰撶敤鎴风粰浜嗘槑纭殑鍘嗗彶 WinForm 鎴浘鏃讹紝搴斾紭鍏堟寜鎴浘閲屽瓧娈靛彛寰勫拰鎿嶄綔鑺傚瀵圭収瀹炵幇锛岃€屼笉鏄户缁部鐢ㄤ笂涓€杞嚜宸辨帹鏂嚭鐨勮〃缁撴瀯鍒嗘敮銆?
### 2026-03-21
- 鐢ㄦ埛瑕佹眰灏嗚鍒掋€侀獙璇併€佹暀璁矇娣€鍜屼紭闆呭疄鐜版寮忚惤鍒伴」鐩枃妗ｄ腑锛屽悗缁繀椤讳弗鏍兼墽琛屻€?- 褰撶敤鎴锋弿杩扳€滄斁涓嬮潰鈥濊繖绫诲竷灞€璇夋眰鏃讹紝蹇呴』鍏堝尯鍒嗘槸鍚屼竴姝ュ唴鐨勮瑙夊垎鍖猴紝杩樻槸鏂板涓€涓悗缃楠わ紝涓嶈兘鐩存帴鎸夐〉闈㈡帓鐗堢悊瑙ｃ€?- 鍋氱晫闈㈠彲瑙嗛珮搴﹀垽鏂椂锛屼笉鑳藉彧渚濊禆鏈湴鏀惧ぇ鍚庣殑瑙嗗彛鎴栨埅鍥剧缉鐣ュ浘锛屽繀椤绘寜鐢ㄦ埛鐪熷疄甯歌绐楀彛楂樺害楠岃瘉鏄惁瀹屾暣鍙銆?- 瀵瑰悗鍙伴厤缃伐浣滃彴锛屽厛璁捐婊氬姩褰掑睘鍜岄珮搴﹀垎閰嶏紝鍐嶅喅瀹氬瓧娈靛帇缂╂柟寮忥紱鍚﹀垯瀹规槗璇妸瀹瑰櫒灞傜骇闂褰撴垚瀛楁澶銆?- 褰撶敤鎴锋槑纭〃绀衡€滆繖涓尯鍩熷彲浠ヤ笉鐢ㄨ〃鏍尖€濇椂锛屼笉瑕佺户缁墽鐫€淇濈暀琛ㄦ牸闅愬柣锛屽簲鍥炲埌浠诲姟鏈川锛岄€夋洿閫傚悎鐨勪富浠庡崱鐗囥€佸垪琛ㄦ垨宸ヤ綔鍙扮粨鏋勩€?- 褰撶敤鎴风户缁寚鍑衡€滅暀鐧藉お澶氥€侀噸搴﹂厤缃笉椤烘墜鈥濇椂锛屼笉瑕佸彧闈犵缉灏忚緭鍏ユ楂樺害淇ˉ锛涘簲鐩存帴閲嶆瀯鎴愬崱鐗囧紡涓讳粠宸ヤ綔鍙帮紝璁╂憳瑕佹煡楠屽拰璇︽儏缂栬緫鍒嗗眰娓呮櫚銆?- 褰撳瓧娈靛彧鏄彧璇绘煡楠屼俊鎭€屼笉鏄彲缂栬緫閰嶇疆鏃讹紝涓嶈鏀捐繘鍙充晶閰嶇疆琛ㄥ崟锛涘簲浼樺厛鏀惧埌宸︿晶鍗＄墖鎴栨憳瑕佸尯灞曠ず銆?- 褰撴煇浜涢〉绛惧彧鏄ā鍨嬫槧灏勬垨鍙鏌ラ獙鍏ュ彛锛岃€屼笉鏄檺鍒舵帾鏂界殑鏍稿績閰嶇疆鏃讹紝涓嶈缁х画鐣欏湪绗?6 姝ラ噷鍗犵┖闂达紱搴旂洿鎺ヤ粠闄愬埗鎺柦椤电涓Щ闄ゃ€?- 褰撻檺鍒舵帾鏂介噷淇濈暀澶氫釜涓氬姟椤电鏃讹紝鍙充晶甯冨眬涓嶈兘涓€椤典竴濂楅鏍硷紱搴旂粺涓€涓哄悓涓€绫绘憳瑕佹潯 + 閰嶇疆鍗″伐浣滃彴锛岄伩鍏嶆煇浜涢〉绛剧户缁部鐢ㄨ€佸紡鍙屾爮绌洪潰鏉裤€?- 褰撶敤鎴峰弽棣堚€滅粨鏋勫彲浠ヤ絾鐪嬭捣鏉ヤ贡鈥濇椂锛岄棶棰橀€氬父涓嶅湪瀛楁澶氬皯锛岃€屽湪鍚屼竴淇℃伅琚噸澶嶆斁缃€佽鏄庢枃瀛楄繃澶氥€佸崱鐗囧眰绾т笉涓€鑷达紱浼樺厛缁熶竴楠ㄦ灦骞跺垹闄ら噸澶嶄俊鎭紝鑰屼笉鏄户缁彔鏍峰紡銆?# 2026-03-21 楂橀閰嶇疆琛ュ厖鏁欒
- 瀵归珮棰戦厤缃晫闈紝鐢ㄦ埛璇粹€滃垏鎹笉涓濇粦鈥濇椂锛岃浼樺厛妫€鏌ユ槸鍚︽湁浜轰负寮曞叆 `deferred`銆佸娆℃棤鏁?setState 鎴栭噸澶嶆覆鏌擄紝鑰屼笉鏄彧鐩瑙夋牱寮忋€?- 瀵瑰伐浣滃彴寮忕晫闈紝鍑虹幇澶ч噺鐣欑櫧鏃讹紝鍏堟鏌ュ鍣ㄩ珮搴︾瓥鐣ュ拰 `flex-1 / h-full / min-h-*` 鐨勫彔鍔犲叧绯伙紝鍐嶅喅瀹氭槸鍚﹁缂╂帶浠躲€?- 鏄庣粏宸ヤ綔鍖虹殑妯″紡鍒囨崲鎺т欢搴斿敖閲忓苟鍏ヤ富宸ュ叿鏉★紝閬垮厤鍐嶉澶栧崰涓€鏉″簳鏍忥紝鎶婃湁鏁堥珮搴︽氮璐瑰湪鈥滆鏄庡紡宸ュ叿鏍忊€濅笂銆?- fullscreen 宸ヤ綔鍖轰笉鑳藉彧鐪嬪唴閮ㄩ潰鏉挎槸鍚︾揣鍑戯紝杩樿閲忓灞?stage 鍒板簳閮ㄦ搷浣滄爮鐨勭湡瀹?gap锛涘惁鍒欏鏄撴妸绌虹櫧浠庨潰鏉块噷鎸埌闈㈡澘澶栥€?
### 2026-03-21 鏄庣粏鍙屾ā寮忔暟鎹簮
- 褰撶敤鎴锋弿杩颁袱绉嶄簰鏂ョ殑鏁版嵁婧愮瓥鐣ユ椂锛屼笉瑕佹妸涓€鍗婇厤缃斁鍦ㄩ〉绛捐涓恒€佷竴鍗婃斁鍦ㄨ〃鏍煎睘鎬ч噷锛涘繀椤荤粺涓€鍒颁竴涓€滄暟鎹簮鈥濆叆鍙ｏ紝鍚﹀垯鍚庣画鍛樺伐閰嶇疆鏃朵細澶卞幓鍏ㄥ眬鐞嗚В銆?
### 2026-03-21 妯″潡璁剧疆鑸炲彴鐣欑櫧
- 褰撶敤鎴锋寚鍑虹 5 姝ユā鍧楄缃簳閮ㄥぇ鐗囩暀鐧芥椂锛岃浼樺厛妫€鏌ュ灞?`stage` 鏄惁鐢ㄤ簡鍥哄畾楂樺害銆佷笂涓?pane 榛樿姣斾緥鏄惁澶辫　锛岃€屼笉鏄户缁帇鍙充晶鍗＄墖鎴栧眬閮ㄦ帶浠躲€?- 濡傛灉鏄庣粏鍖轰娇鐢ㄧ揣鍑戣〃鏍肩敾甯冿紝涓嶈兘鍙粰 `min-height`锛涜鍚屾椂缁欑埗瀹瑰櫒 `h-full / flex-1`锛屽苟鎶婇鏋惰娌挎暣涓敾甯冨垎甯冿紝鍚﹀垯瑙嗚涓婁細鍍忓唴瀹圭缉鍦ㄩ《閮ㄣ€佷笅鍗婂尯鏁村潡鍙戠┖銆?### 2026-03-22 鏄庣粏閰嶇疆浣撻獙
- 濡傛灉鐢ㄦ埛鏄庣‘鎸囧嚭鈥滀笉瑕佸鍑哄嚑鎺掑厜褰?楠ㄦ灦鈥濓紝灏变笉鑳藉啀鎷胯楗版€х殑 skeleton 鍏呭綋琛ㄤ綋瀵嗗害锛涘簲鍥炲埌骞插噣琛ㄦ牸闈㈡垨鐪熷疄鍗犱綅琛岋紝鑰屼笉鏄户缁爢瑙嗚鏁堟灉銆?- 瀵归珮棰戦厤缃満鏅紝鏁版嵁婧愬叆鍙ｅ繀椤绘敹鏁涘埌涓€澶勶紱鈥滈〉绛捐涓洪噷涓€濂椼€佹暣琛ㄥ睘鎬ч噷鍐嶄竴濂椻€濈殑璁捐浼氱洿鎺ュ埗閫犵悊瑙ｆ垚鏈€?- 褰撶敤鎴峰弽棣堚€滆繕鏄湁涓€鐐瑰欢杩熲€濇椂锛屼笉瑕侀粯璁ょ户缁敤 transition/deferred锛涜浼樺厛鍥炴煡鏄惁鎶婇珮棰戦€変腑閾捐矾鏀捐繘浜嗕綆浼樺厛绾ф洿鏂般€?- 鏄庣粏椤电鏈韩濡傛灉鍙槸瀵硅薄鍒囨崲鍏ュ彛锛屽氨涓嶈榛樿鎶婂彸渚у甫鍒扳€滈〉绛捐涓衡€濊€屼笉鏄€滃綋鍓嶆槑缁嗘暣琛ㄩ厤缃€濓紱榛樿钀界偣蹇呴』鏄敤鎴峰綋涓嬫渶甯告敼鐨勬暟鎹簮鍜屾暣琛ㄥ睘鎬с€?### 2026-03-22 鏄庣粏绫诲瀷鍏ュ彛浣嶇疆
- 瀵归珮棰戦厤缃叆鍙ｏ紝鐢ㄦ埛宸茬粡褰㈡垚绋冲畾蹇冩櫤鍚庯紝涓嶈涓轰簡鈥滆瑙夌粺涓€鈥濇妸鍏ュ彛浠庡師鏈変綅缃尓璧帮紱灏ゅ叾鍍忔槑缁嗙被鍨嬭繖绉嶆ā寮忓垏鎹紝浼樺厛淇濈暀鍙充笅瑙掕繖绫诲巻鍙蹭綅缃紝鍑忓皯閲嶆柊鐞嗚В鎴愭湰銆?### 2026-03-22 妯″潡鏉′欢鏉℃敹鏁?- 褰撲富琛ㄦ潯浠跺拰宸﹁〃鏉′欢灞炰簬鍚屼竴宸ヤ綔闈㈤噷鐨勯珮棰戦厤缃椂锛屼笉瑕佹妸瀹冧滑鎷嗗湪宸﹀彸鍚勮嚜宸ュ叿鏉￠噷锛涘簲缁熶竴鏀舵暃鍒版ā鍧楅《閮紝閫氳繃杞婚噺鍒囨崲鎸夐挳绠＄悊褰撳墠浣滅敤鍩燂紝閬垮厤瑙嗙嚎鏉ュ洖璺炽€?- 鈥滈粯璁よ繘鍏ョ姸鎬佲€濅笉鑳藉彧鏀逛竴涓垵濮?`useState`锛涜繕瑕佹帓鏌ュ悗缁?`useEffect`銆佹墦寮€鍚戝鍏ュ彛鍜屾楠ゅ垏鎹㈤噷鏄惁鏈夊己鍒惰鐩栫姸鎬佺殑閫昏緫銆?### 2026-03-22 妯″潡璁剧疆浜や簰涓庨潪鍏ㄥ睆甯冨眬
- 鍒楀鎷栨嫿杩欑被璁捐鍣ㄨ兘鍔涳紝涓嶈兘鎶婃渶灏忓搴︾粦姝诲湪鏍囬鏂囨瀹藉害涓婏紱濡傛灉鐢ㄦ埛鏄庣‘闇€瑕佹嫋鍒版帴杩?`0px`锛屽簲鎶婃爣棰樻樉绀哄拰鍒楃墿鐞嗗搴﹁В鑰︼紝鐢ㄦ埅鏂€佹偓娴彁绀烘垨閫変腑鎬佸鐞嗗彲璇绘€с€?- 褰撶敤鎴峰弽棣堚€滅偣鍑绘潯浠舵垨宸﹁〃鍚庝笅鏂瑰嚭鐜板ぇ鐗囩暀鐧解€濇椂锛屼笉瑕佸彧鐪嬪崟涓潰鏉块珮搴︼紝蹇呴』鍥炴煡鐐瑰嚮鍚庢暣涓笂涓?pane 鍒嗛厤銆佺┖鎬佸鍣?`min-height`銆佷互鍙婁笉鍚?scope 涓嬬殑 fallback 鐢诲竷鏄惁閲嶆柊鍗犳弧銆?- 闈炲叏灞忔ā寮忎笅鍙充晶妫€鏌ュ櫒涓嶈兘娌跨敤鍏ㄥ睆鏀剁獎閫昏緫锛涘簲璁╁搴︽寜鍙敤绌洪棿鑷€傚簲鍒拌冻澶熷睍绀洪〉绛炬枃妗堬紝閬垮厤閫氳繃鎹㈣鐗虹壊鍙鎬с€?### 2026-03-22 鏄庣粏绫诲瀷鍒囨崲鍏ュ彛
- 褰撶敤鎴峰凡缁忔帴鍙椻€滄槑缁嗙被鍨嬪垏鎹㈡斁鍦ㄤ笅鏂光€濈殑蹇冩櫤鍚庯紝涓嶈鍐嶆妸瀹冨仛鎴愯创鍦ㄧ敾甯冮噷鐨勫绔嬫偓娴帶浠讹紱搴旀敹鎴愮嫭绔嬪簳閮?panel锛岃瀹冩垚涓哄伐浣滃彴鐨勪竴閮ㄥ垎锛岃€屼笉鏄紓鍦ㄥ唴瀹逛笂灞傘€?- 寮曞叆 `shadcn/ui` 椋庢牸鏃讹紝涓嶄竴瀹氳鍏堟暣搴撹縼绉伙紱鍙互鍏堟妸楂橀鍏ュ彛鍋氭垚鏇村厠鍒剁殑 segmented/panel 璇硶锛屽厛钀藉湪灞€閮ㄥ伐浣滈潰涓婇獙璇佽川鎰熷拰椤烘墜搴︺€?### 2026-03-22 鏉′欢宸ヤ綔鍙颁笌搴曢儴绫诲瀷 Panel
- 褰撶敤鎴锋槑纭姹傚浐瀹氭潯浠舵帶浠舵€诲搴︽椂锛屼笉瑕佺户缁繚鐣欐棫鐨勬寜鍚嶅瓧闀垮害鍔ㄦ€佹拺瀹藉拰鎷栨嫿璋冨锛涘簲鐩存帴鎶婂悕瀛楀睍绀轰笌鎺т欢鐗╃悊瀹藉害瑙ｈ€︼紝鏀舵垚缁熶竴瀹藉害宸ヤ綔鍙般€?- 椤堕儴鏉′欢鍖轰笉鑳藉彧鏀寔鈥滈€愪釜瀛楁閰嶇疆鈥濓紝杩樿鏀寔鈥滈潰鏉跨骇鎬昏閰嶇疆鈥濓紱鍍忚鏁般€佸垎鏍忔暟銆佹壒閲忕矘璐存瀯寤鸿繖绫诲竷灞€绾ц兘鍔涳紝搴旇鍦ㄥ彸渚у崟鐙缓涓€涓€昏鍒嗘敮锛岃€屼笉鏄杩涘崟涓潯浠惰〃鍗曘€?- 褰撶敤鎴疯鍙柊鐨勭粨鏋勪絾涓嶈鍙€変腑鑹插拰宸︿晶浠嬬粛鏃讹紝涓嶈鍥為€€鏁翠綋缁撴瀯锛涘簲淇濈暀缁撴瀯锛屽彧鏀舵帀淇″彿灞傦細棰滆壊銆佹憳瑕佹枃妗堛€佷俊鎭瘑搴︺€?### 2026-03-22 鏉′欢鏉′笌甯冨眬绋冲畾
- 褰撶敤鎴峰厛鎺ュ彈 `175px` 榛樿瀹藉害銆侀殢鍚庡張鏄庣‘瑕佹眰鎭㈠鎷栧鏃讹紝姝ｇ‘瑙勫垯涓嶆槸鈥滅户缁妸瀹藉害鍐欐鈥濓紝鑰屾槸鈥滈粯璁ゅ搴﹀浐瀹氥€佸疄闄呭搴﹀彲鎷栧彲鏀光€濄€傞粯璁ゅ€煎拰鍙皟鑳藉姏瑕佽В鑰︺€?- 椤堕儴鏉′欢鍖哄睘浜庨珮棰戞帓甯冨尯鍩燂紝涓嶈鍐嶅仛鎴愭槑鏄惧崱鐗囧潡锛涜秺鍍忓崱鐗囷紝鐢ㄦ埛瓒婇毦鍒ゆ柇鐪熷疄闂磋窛銆傚簲浼樺厛浣跨敤鎵佸钩琛屽紡 workbench 璇硶銆?- 涓婁笅宸ヤ綔鍖哄垎闅旀潯鐨勪綅缃笉鑳戒緷璧栧綋鍓嶉€変腑瀵硅薄鍔ㄦ€佹姮楂橈紝鍚﹀垯鐢ㄦ埛浼氱洿鎺ユ劅鐭ユ垚鈥滅偣鍑绘椂鐣岄潰鍦ㄦ姈鈥濄€俻ane 楂樺害绛栫暐瑕佸敖閲忕ǔ瀹氾紝閫変腑鎬佸彧鏀瑰唴瀹癸紝涓嶆敼澶ф鏋躲€?- 鏉′欢鏍囩鍜屾帶浠剁殑璺濈瑕佸厛鏈嶅姟浜庤鍙栦笌闂磋窛鍒ゆ柇锛岃鏄庢€ц楗板拰棰濆鐣欑櫧搴斿悗缃€?### 2026-03-22 鏉′欢宸ヤ綔鍙扮洿鎺ユ搷浣滀紭鍏?- 褰撶敤鎴峰凡缁忔槑纭鈥滄嫋鍏ユ瘡涓€涓帶浠惰鏁颁腑鈥濇椂锛屼笉瑕佺户缁繚鐣欌€滄瘡琛屽垎鏍忊€濊繖绫绘娊璞℃暟瀛楅厤缃紱搴斿洖鍒扮洿鎺ユ搷鎺фā鍨嬶紝鐢ㄧ湡瀹炶瀹瑰櫒鎵挎帴鎷栨斁銆?- 瀵归珮棰戞帓甯冨尯锛屽竷灞€妯″瀷鍙兘淇濈暀涓€濂椼€備笉鑳戒竴杈硅鐢ㄦ埛鎸夎鎷栨斁锛屼竴杈瑰張璁?grid 鍒嗘爮鏁扮户缁富瀵煎竷灞€锛屽惁鍒欎細鍒堕€犵悊瑙ｅ啿绐併€?- 鏉′欢瀹藉害鎷栨嫿鐨勨€滃崱鈥濋€氬父涓嶆槸瑙嗚闂锛岃€屾槸姣忓抚鍏ㄩ噺鏇存柊鏁扮粍瀵艰嚧鐨勶紱瑕佷紭鍏堜紭鍖栨洿鏂伴摼璺拰閲嶆覆鏌撹寖鍥达紝鑰屼笉鏄彧鏀规嫋鎷芥墜鏌勬牱寮忋€?### 2026-03-22 鍙充晶璇︽儏鍘诲啑浣?- 褰撶敤鎴锋槑纭姹傗€滃彸渚ц鎯呮暣浣撲紭鍖栤€濇椂锛屼笉瑕佺户缁眬閮ㄤ慨涓€涓垎鏀紱搴斾紭鍏堟敹鏁涘叕鍏遍鏋躲€佽緭鍏ユ帶浠跺拰 tabs 璇硶锛岃涓昏〃銆佸垪銆佹潯浠躲€佹槑缁嗙瓑妫€鏌ュ櫒鍏辩敤鍚屼竴濂楄瑙夎妭濂忋€?- 楂橀鍔炲叕濉啓闈㈡澘閲岋紝浣庝环鍊艰鏄庢枃妗堜細鐩存帴鍒堕€犲櫔闊炽€傚儚鈥滆繖閲岀粺涓€缁存姢鈥︹€濄€佲€滃厛浠庝笂闈㈤€夋嫨鈥︹€濊繖绫绘彁绀猴紝鑻ヤ笉鎵挎媴鍏抽敭鍐崇瓥淇℃伅锛屽氨搴旇鍒犳帀鎴栧帇缂╂垚鏈€鐭姸鎬佹枃妗堛€?- shadcn/ui 椋庢牸杩佺Щ涓嶇瓑浜庡繀椤绘暣搴撳畨瑁咃紱褰撻」鐩繕澶勫湪閲嶆瀯鏈熸椂锛屽厛鎶婄幇鏈夊３灞傚拰琛ㄥ崟鎺т欢鏀舵垚 shadcn 鐨勫悗鍙拌娉曪紝寰€寰€姣斿紩鍏ユ暣濂椾緷璧栨洿绋炽€?- 褰撶敤鎴疯姹傗€滃彸渚ц鎯呮暣浣撲紭鍖栤€濇椂锛屼笉鑳藉彧鏀硅緭鍏ユ鏍峰紡锛涘繀椤讳竴璧锋敹鍙?panel銆乼abs銆乥adge銆佽鏄庢枃妗堝拰鎶€鏈槧灏勫憟鐜版柟寮忥紝鍚﹀垯鐪嬭捣鏉ヤ粛鐒跺儚鏃х郴缁熸崲浜嗕竴灞傜毊銆?- 瀵归珮棰戦厤缃潰鏉匡紝鎶€鏈〃鍚嶅拰鏄犲皠鍏崇郴涓嶈鍐嶇敤涓€涓叉爣绛惧爢鍦ㄦ渶涓婇潰锛涙洿閫傚悎鏀规垚鐭崱鐗囨垨璁℃暟鍏ュ彛锛屾妸娉ㄦ剰鍔涚暀缁欑湡姝ｅ彲濉啓鐨勫瓧娈点€?- shadcn 鍖栦紭鍏堢骇搴旀槸锛氬厛缁熶竴鍏叡鍩虹璇硶锛屽啀杩侀珮棰戝垎鏀紱濡傛灉鍏堥€愪釜鍒嗘敮闅忔墜鏀?class锛屾渶缁堣繕鏄細鍥炲埌鈥滀竴椤典竴绉嶉鏍尖€濄€?### 2026-03-22 椤堕儴鏉′欢鎷栨嫿鍖?- 椤堕儴鏉′欢杩欑楂橀鎷栨嫿宸ヤ綔鍖猴紝涓嶈鍐嶉澶栨斁琛屽簭鍙枫€佽鏍囪繖绫昏楗颁俊鎭紱瀹冧滑浼氱洿鎺ュ共鎵扮敤鎴峰垽鏂湡瀹為棿璺濆拰鎷栨嫿钀界偣銆備紭鍏堜繚鐣欑函鎺т欢琛屻€?### 2026-03-22 鍗曟嵁涓昏〃涓庢潯浠跺尯缁熶竴
- 褰撶敤鎴峰凡缁忚鍙《閮ㄦ潯浠跺尯鐨勬柊 workbench 璇硶鍚庯紝鍗曟嵁涓昏〃杩欑被鍚屾牱鏄珮棰戞嫋鎷芥帓甯冨尯鐨勬帶浠朵篃瑕佸敖蹇敹鏁涘埌鍚屼竴濂楄瑷€锛涗笉瑕佽鏉′欢銆佷富琛ㄣ€佹槑缁嗗悇鑷淮鎸佷竴濂椾笉鍚岀殑瑙嗚鍜屼氦浜掕鍒欍€?- 鐐瑰嚮鍗曟嵁涓昏〃鎴栨槑缁嗗璞″悗濡傛灉涓嬪崐鍖轰細缂╃煭鎴栫暀鐧斤紝浼樺厛妫€鏌ヤ笂涓?pane 鐨勯珮搴﹀垎閰嶅拰瀹瑰櫒 `flex/min-h/h-full` 鍏崇郴锛岃€屼笉鏄户缁線绌虹櫧閲屽鍗犱綅鍧椼€?### 2026-03-22 鍗曟嵁涓昏〃娴佸紡甯冨眬
- 褰撶敤鎴锋槑纭姹傚崟鎹富琛ㄢ€滀笉鍐嶈嚜鐢辨嫋鍔ㄣ€佹敼鎴愬拰鏉′欢鍖轰竴鏍风殑娴佸紡甯冨眬鈥濇椂锛屼笉鑳界户缁湪鑷敱鍧愭爣绯荤粺涓婁慨琛ワ紱搴旂洿鎺ユ妸甯冨眬妯″瀷鏀规垚鎸夎銆佹寜椤哄簭銆佸彲鎻掑叆鐨勫伐浣滈潰銆?- 瀵规祦寮忓伐浣滃彴锛屾嫋鍒板彟涓€涓帶浠跺墠鏂圭殑棰勬湡涓嶆槸浜ゆ崲浣嶇疆锛屼篃涓嶆槸鍙敼鍧愭爣锛涘簲璇ュ疄鐜版彃鍏ラ噸鎺掞紝璁╃洰鏍囨帶浠跺拰鍏跺悗缁帶浠惰嚜鍔ㄩ『寤躲€?### 2026-03-22 鍗曟嵁涓昏〃琛屽伐浣滃彴琛ュ厖
- 鍗曟嵁涓昏〃杩欑被楂橀鎺掑竷鍖猴紝涓€鏃︾敤鎴疯姹傗€滃拰鏉′欢鍖轰竴鏍风殑娴佸紡甯冨眬鈥濓紝灏变笉瑕佸啀淇濈暀鏃х殑鑷敱鍧愭爣鎷栨嫿鍏ュ彛锛涘竷灞€妯″瀷鍜屼氦浜掓ā鍨嬪繀椤讳竴璧峰垏鎹€?- 娴佸紡鎺掑竷閲岀殑鎷栨斁棰勬湡鏄€滄彃鍏モ€濊€屼笉鏄€滆鐩栤€濇垨鈥滀氦鎹⑩€濓紝鎷栧埌鏌愪釜鎺т欢鍓嶉潰鏃讹紝鐩爣鍙婂悗缁帶浠堕兘瑕佷富鍔ㄥ悗绉讳竴浣嶃€?- 娴佸紡宸ヤ綔鍙伴噷鑻ヤ繚鐣欐í鍚戞孩鍑鸿兘鍔涳紝榛樿鍙婊氬姩鏉′細琚敤鎴疯鍒ゆ垚澶氫綑鐏扮嚎锛涘簲淇濈暀婊氬姩鑳藉姏锛屼絾闅愯棌婊氬姩鏉℃湰韬€?### 2026-03-22 鍩虹妗ｆ鏉′欢鎻掑叆寮忔嫋鏀?- 褰撶敤鎴峰凡缁忕‘璁ゅ崟鎹富琛ㄤ娇鐢ㄢ€滄嫋鍒板墠闈㈠嵆鎻掑叆銆佺洰鏍囪嚜鍔ㄥ悗绉烩€濈殑璇箟鍚庯紝鍩虹妗ｆ椤堕儴鏉′欢鍖哄繀椤诲悓姝ユ垚鍚屼竴濂楁嫋鏀捐鍒欙紝涓嶈兘涓€涓尯鍩熸槸鎻掑叆寮忥紝鍙︿竴涓尯鍩熻繕鏄寜琛岃拷鍔犮€?- 鏉′欢鍖鸿繖绫绘寜琛?workbench 鐨勬嫋鏀剧姸鎬侊紝涓嶈兘鍙褰曗€滃綋鍓嶈鈥濓紱瑕佸悓鏃惰褰曗€滃綋鍓嶈 + 鍓嶆彃鐩爣鎺т欢鈥濓紝鍚﹀垯钀界偣鍙兘鍒拌灏撅紝鍋氫笉鍑虹湡姝ｇ殑鍓嶆彃閲嶆帓銆?### 2026-03-22 鏉′欢鍖烘嫋鏀捐涔夊榻?- 鍙鐢ㄦ埛宸茬粡纭鏌愪釜楂橀鎺掑竷鍖轰娇鐢ㄢ€滃墠鎻掑嵆鍚庣Щ鈥濈殑鎷栨斁璇箟锛屽叾瀹冨悓绫诲瀷 workbench 涔熻鍚屾瀵归綈锛屼笉鑳借鍩虹妗ｆ鏉′欢鍖哄拰鍗曟嵁涓昏〃鍑虹幇涓ゅ涓嶅悓鐨勬帓搴忚鍒欍€?### 2026-03-22 鍩虹妗ｆ鏄庣粏妯″潡鍙充晶璇︽儏
- 褰撶敤鎴锋槑纭姹傗€滃熀纭€妗ｆ鐐瑰嚮鏄庣粏妯″潡锛屽彸渚ц鎯呭弬鐓ф煇寮犲巻鍙茶〃缁撴瀯鈥濇椂锛屼笉鑳界户缁部鐢ㄥ綋鍓嶆渶灏忓寲閰嶇疆鍒嗘敮锛涜鍥炲埌鍘嗗彶鏁版嵁妯″瀷锛屾妸鍙充晶妫€鏌ュ櫒鎸夌洰鏍囪〃鐨勫瓧娈靛彛寰勯噸寤恒€?- 瀵光€滄槑缁嗘ā鍧椻€濊繖绉嶉绻佸～鍐欑殑鍙充晶璇︽儏锛屼笉瑕佷繚鐣欏ぇ娈佃В閲娿€佽瑙夎鏄庢垨姒傚康鎬ф帓鐗堬紱浼樺厛淇濊瘉瀛楁鐩寸粰銆佺粨鏋勬竻妤氥€佸～鍐欓『鎵嬨€?- shadcn 鍖栦笉绛変簬缁х画鍙犲姞璇存槑鍗＄墖锛涜繖绉嶅満鏅洿閫傚悎鐢ㄥ叡浜殑 shadcn inspector 楠ㄦ灦锛岀洿鎺ョ粍缁囪緭鍏ラ」鍜屽紑鍏炽€?- 鏂板鍙充晶妫€鏌ュ櫒鍒嗘敮鏃讹紝蹇呴』鍦ㄦ祻瑙堝櫒閲岄獙璇佲€滅湡瀹炵偣鍑诲叆鍙ｂ€濆凡缁忓垏鍒拌鍒嗘敮锛涘鏋滃叆鍙ｈ繕钀藉湪鏃у垎鏀紝鍐嶅畬鏁寸殑琛ㄥ崟涔熺瓑浜庝笉鍙敤銆?### 2026-03-22 鏄庣粏椤电涓庡唴閮ㄨ鍥捐亴璐ｅ垎娴?- 褰撶敤鎴疯鈥滄槑缁嗛〉绛惧彲浠ラ厤涓€閮ㄥ垎锛岄噷闈㈡帶浠朵篃鍙互閰嶄竴閮ㄥ垎鈥濇椂锛屼紭鍏堟鏌ユ槸涓嶆槸鎶娾€滈〉绛惧璞♀€濆拰鈥滃唴閮ㄨ鍥惧璞♀€濆叡鐢ㄤ簡鍚屼竴涓€変腑鎬侊紱杩欑被闂鐨勬牴鍥犻€氬父涓嶆槸鍗曚釜琛ㄥ崟澶贡锛岃€屾槸閫変腑妯″瀷娌℃湁鎷嗗眰銆?- 搴曢儴绫诲瀷鍒囨崲灞炰簬鈥滆鍥惧垏鎹⑩€濓紝涓嶅簲璇ラ粯璁ょ瓑浜庘€滃彸渚ц鎯呭垏鎹⑩€濄€傚彧鏈夌敤鎴风湡姝ｇ偣鍑诲埌琛ㄦ牸鍖哄煙銆佸浘琛ㄩ鐣欏尯杩欑被鍐呴儴瑙嗗浘瀵硅薄鏃讹紝鍙充晶鎵嶅簲璇ュ垏鍒板搴旇鎯呫€?- 鍥捐〃瑙嗗浘鐨勫彸渚ч厤缃笉瑕侀噸澶嶆壙杞芥暟鎹潵婧愩€佽〃鏍兼憳瑕併€侀鑹?鍙抽敭鍏ュ彛绛夋暣琛ㄧ骇淇℃伅锛涘浘琛ㄩ潰鏉垮彧淇濈暀 `p_systemdlltabchart` 鏈韩闇€瑕佺殑瀛楁锛屽叾浣欎俊鎭暀鍦ㄦ槑缁嗚〃閰嶇疆閲屻€?## 2026-03-23 Document Split And Group Workbench
- If both upper and lower panes are high-frequency work areas, do not keep a draggable divider by default; use a stable equal split so clicks in the lower area do not feel like the layout is collapsing.
- Width resizing in high-frequency workbenches must share one implementation path: live preview, requestAnimationFrame throttling, and snap/tick feedback. Mixed resize patterns are immediately noticeable to users.
- When a user asks for alignment guidance while resizing, a pixel HUD alone is not enough; expose snap tick cues so micro-adjustment feels intentional.
- If archive main-table layout already has a grouping concept, do not keep it as one oversized detail form. Promote it to a master-detail workbench where users choose a group, then edit row count and grouped fields inside that group.
- Right-side inspectors inside narrow panels should prefer vertical flow over wide two-column grids; breakpoint-driven desktop grids break down quickly in non-fullscreen configuration screens.

## 2026-03-23 Detail Tab Unified Inspector
- If the user says all detail configuration should be handled inside the tab, do not keep a separate detail-tab form and detail-grid form in parallel. Use one inspector model and pull tab-level fields into it.
- For archive detail tabs, selecting the tab itself should already enter the same configuration path as the current detail view; bottom view clicks should refine the current view, not switch users into a different conceptual object.
- When a table detail is described as basically inheriting main-table behavior, preserve the same table-grade tabs and capabilities instead of inventing a reduced detail-specific inspector.

## 2026-03-23 Settings Inspector Density Refresh
- When users complain that the settings UI feels empty or bloated on 1080p screens, do not keep optimizing one inspector branch at a time. Flatten the shared shell first: panel radius, shadow, padding, tab density, input height, and card nesting.
- Perceived whitespace in workbench-style screens often comes from repeated rounded wrapper layers, not only from literal empty gaps. Removing low-value cloud cards and summary chips usually improves clarity more than shrinking individual fields.
- Dense admin/workbench screens should move technical mapping hints and counts into compact badge rows or header metadata instead of dedicated mini cards, so the editable form fields remain the visual focus.
- Central canvas surfaces and right-side inspectors must be tightened together. If only the right inspector becomes dense while the center still uses large cloudy shells, the whole screen still reads as loose and inconsistent.

## 2026-03-27 Single Table Table Edge Tightening
- 琛ㄦ牸鍖哄煙鈥滅湅璧锋潵杩樻湁涓€鍦堢獎杈硅窛鈥濇椂锛屼笉鑳藉彧鐩灞傚鍣?padding锛涜繕瑕佹鏌ヨ〃鏍兼湰浣撹嚜宸辩殑瀹藉害绛栫暐銆佸３灞傝竟妗嗗拰鍦嗚銆傚摢鎬曞灞傝创杈逛簡锛屽鏋滆〃鏍间粛鎸夊唴瀹瑰搴︽覆鏌撴垨淇濈暀 wrapper border锛岃瑙変笂杩樻槸浼氬儚鐣欎簡涓€鍦堣竟璺濄€?
## 2026-03-23 Archive Main Layout Popup Workbench
- If the user says the right inspector should only show summary information, do not leave the real layout editor embedded in that narrow side panel. Move dense layout editing into a dedicated popup workbench and keep the inspector read-oriented.
- For archive main-table grouping, the draggable source must be the real main-table columns. Do not invent a second synthetic field source, or the user loses trust in what is actually being laid out.
- Group layout editing should follow the same interaction language as other high-frequency workbenches: group list on one side, selected-group rows in the middle, draggable field palette on the other side, with direct row assignment and insert-style drag/drop.

## 2026-03-23 Archive Layout Canvas Workbench
- If the user says the popup still feels too much like master-detail form editing, treat that as a structural correction, not a styling nit. Replace the 鈥渟elect one group, edit one group鈥?flow with an all-groups canvas workbench.
- Layout editors must account for tall controls such as remarks/textareas. Do not assume every field is a single-line chip; field cards should be able to visually occupy more height so spacing and grouping still make sense.
- For dense 1080p workbenches, shadcn-style polish should reduce ceremony, not add it. Fewer side lists and fewer redundant wrappers usually improve layout editing more than adding more summary panels.
## 2026-03-23 Archive Layout Canvas Polish
- Archive layout canvases are not summary cards. If the user is judging spacing and dragging placement, field items must look like real controls, not mini info cards with badges and extra chrome.
- High-frequency width dragging must render from live drag state first and persist second. If the canvas only reflects committed width, users will read the interaction as sticky even when the math is correct.
- Row numbering or leading sequence labels inside layout editors and previews create false spacing cues. When users are arranging fields visually, prefer clean separators or no row label at all.
- Archive layout rows also cannot be oversized containers. In form-layout workbenches, rows should read as light flow lanes; only tall controls should grow, not the entire row shell.
## 2026-03-23 Archive Layout Lane Density
- In layout editors, do not use large bordered row cards as the default visual container. Users judge spacing and drag placement by the row lane itself, so oversized wrappers immediately make the editor feel empty and clumsy.
- Tall controls such as remarks/textareas must grow independently. A tall control should not force every sibling in the same row to stretch to the same height.
- The preview modal must mirror the editor density. If the editor is compact but the preview still uses big grouped cards, users will still perceive the layout system as bloated.

## 2026-03-23 Archive Layout Resize Feedback
- In layout editors, a top-of-screen resize HUD is the wrong feedback for width tuning. Users compare current control edges with nearby controls, so resize guidance should live inside the lane where alignment is being judged.
- For row-based form canvases, width drag guides should prefer previous-row boundary references over abstract tick rulers. That makes alignment decisions match how people visually compare labels and controls.
- Flat control shells are more useful than translucent rounded wrappers when spacing judgment matters. Extra wrapper chrome makes gaps look larger and hides whether controls are truly aligned.

## 2026-03-23 Archive Layout Delete And Alignment Guides
- In layout editors, per-control close buttons should not be mixed into every field shell when bulk selection/delete is the intended editing model. Extra close affordances add noise and make drag targets harder to judge.
- Previous-row alignment feedback must be obvious enough to use while dragging. Subtle tick marks are not sufficient; prefer full-height lane guides plus a stronger active edge guide for the dragged control.

## 2026-03-23 Table Canvas Panel Centering
- When a table workbench includes an internal 鈥渃lick canvas to configure table鈥?panel, do not bind that panel to the summed column widths. Column width feedback belongs to the header row and horizontal scroll area, not to the canvas card itself.
- If both main-table and detail-table builders expose the same canvas interaction, keep them on one shared centered-panel presentation. Fixing only one branch will leave the product feeling visually inconsistent.

## 2026-03-23 Workspace Scrollbar Styling
- If the codebase already uses helper names like `custom-scrollbar`, verify the CSS definition actually exists. An undefined scrollbar helper silently falls back to the browser default and makes the UI look unfinished.
- For workbench-heavy screens, visible scrollbar styling should be unified globally, while `scrollbar-none` stays the explicit opt-out. Styling one panel at a time is fragile and still leaves inconsistent native scrollbars in other high-frequency areas.

## 2026-03-23 Table Header Compactness
- When users complain that narrow columns still look empty, inspect header padding and selection chrome before touching minimum width constants. The wasted space is often inside the header button, not in the width data itself.
- Column selection in dense table builders should use compact emphasis, such as a light inset border plus a small label chip. Large padded selection backgrounds force unnecessary whitespace into 70px-class narrow columns.

## 2026-03-23 Condition Control Preview Minimalism
- Condition bars should not reuse text-heavy field preview rendering by default. If the field name is already shown outside the control, putting placeholder or sample text inside the control makes the UI look duplicated and noisy.
- When only condition previews need to change, add a condition-specific render mode instead of weakening every `filter` preview globally. That keeps layout previews informative while letting condition controls stay visually clean.

## 2026-03-23 Archive Layout Blue Alignment Markers
- Previous-row width guides in layout editors should not stay neutral gray once users are actively using them for alignment. When the guides carry alignment meaning, use the same clear blue accent language as the active edge so the relationship reads immediately.
- If a guide is meant to show top/bottom correspondence, plain dashed lines are too weak. Add distinct endpoints or caps so the guide reads like a full alignment reference, not a leftover separator.
## 2026-03-23 椤圭洰鍒囨崲涓庢畫鐣欒繘绋嬫帓鏌?- 褰撶敤鎴疯鈥滃凡缁忔崲浜嗛」鐩紝浣?VSCode / 杩愯缁撴灉鐪嬭捣鏉ヨ繕鏄棫椤圭洰鈥濇椂锛屼笉瑕佸彧妫€鏌ュ綋鍓嶅伐浣滅洰褰曪紱杩樿鍚屾椂妫€鏌ユ棫浠撳簱鐨?dev 杩涚▼鏄惁浠嶅崰鐢ㄩ粯璁ょ鍙ｃ€?- 瀵?Vite + 鏈湴 API 杩欑被鍙岃繘绋嬮」鐩紝鍒囨崲浠撳簱鍚庡繀椤诲悓鏃舵牳瀵逛笁浠朵簨锛氬綋鍓嶄細璇濊矾寰勩€乂SCode 鎵撳紑鐨勫伐浣滃尯銆?000/3001 绛夊父鐢ㄧ鍙ｅ疄闄呭綊灞炵殑杩涚▼鍛戒护琛屻€?- 濡傛灉褰撳墠浠撳簱棣栨鍚姩鎶?`vite` / `tsx` 涓嶅瓨鍦紝浼樺厛纭 `node_modules` 鏄惁缂哄け锛岃€屼笉鏄鍒や负鑴氭湰閰嶇疆閿欒銆?- 娓呯悊鏃ч」鐩畫鐣欒繘绋嬪悗锛岃閲嶆柊鍚姩褰撳墠浠撳簱骞剁洿鎺ラ獙璇佸墠绔椤靛拰鍋ュ悍妫€鏌ユ帴鍙ｏ紝閬垮厤鍙湅鈥滆繘绋嬪瓨鍦ㄢ€濆氨璇垽涓哄垏鎹㈠畬鎴愩€?
## 2026-03-23 Java 鍚庣鑱旇皟涓?AI 浠ｇ悊鍒嗘祦
- 褰撳墠绔悓鏃朵緷璧?Java 涓氬姟鍚庣鍜屾湰鍦?AI 浠ｇ悊鏃讹紝涓嶈鎶婃墍鏈?`/api/*` 涓€鑲¤剳浠ｇ悊鍒板悓涓€涓洰鏍囷紱搴斿厛鐢?Swagger 鏍稿鎺ュ彛褰掑睘锛屽啀鎸?`/api/ai/*` 鍜屽叾浠栦笟鍔℃帴鍙ｅ垎娴併€?- 濡傛灉涓氬姟鎺ュ彛宸茶縼鍒版湰鍦?Java 鍚庣锛岄粯璁?`VITE_API_BASE_URL`銆乣.env.example` 鍜?README 涔熻涓€璧锋洿鏂帮紱鍙敼 Vite 浠ｇ悊鑰屼繚鐣欐棫榛樿鍦板潃锛屼笅涓€娆￠噸鍚粛浼氳繛鍥炴棫鐜銆?- 鑱旇皟楠岃瘉涓嶈兘鍙湅棣栭〉鑳芥墦寮€銆傝嚦灏戣鍚屾椂楠岃瘉涓€涓棤閴存潈涓氬姟鎺ュ彛鍜屼竴涓?AI 鍋ュ悍妫€鏌ユ帴鍙ｏ紝纭涓ゆ潯浠ｇ悊閾捐矾閮藉疄闄呯敓鏁堛€?- 濡傛灉鍏徃鍒楄〃宸查€氫絾鍛樺伐鍒楄〃鎺ュ彛浠嶈秴鏃舵垨鎶ラ敊锛屽簲鏄庣‘鏍囪涓哄悗绔幆澧冮樆濉烇紝鑰屼笉鏄湪鍓嶇缁х画鍫嗗厹搴曢€昏緫鎺╃洊鎺ュ彛闂銆?## 2026-03-23 Resize Preview Commit Split
- In hot workbench resizing, the key optimization is not changing drag libraries; it is separating live preview from committed business state. If drag math is correct but every mousemove still rewrites the full column array, users will still read the interaction as sticky.
- Verification for resize smoothness should compare two signals at once: the canvas/header width must change during drag, while the inspector width input should stay on the old committed value until mouseup. That proves preview and commit are actually decoupled.
- When starting to modularize a giant dashboard file, split the hottest interaction path first into a feature module. Pulling resize state and preview scheduling out of the monolith is a safer first enterprise-style refactor than trying to explode the whole screen in one pass.

## 2026-03-23 Shadcn UI Baseline First
- When users explicitly require shadcn/ui and Tailwind consistency, do not keep patching old glass or material-icon branches in place. Establish the base primitives first: `cn()`, minimal shadcn UI components, and shared designer class helpers.
- In a mixed legacy screen, unify the exact branches the user can currently see before expanding scope. For this workbench, the visible condition bar and detail workspace mattered more than untouched legacy modals.
- For detail tab workspaces, keep the tab strip, empty state, and canvas shell on the same visual language. If only one of those three is migrated, the screen still reads as inconsistent.

## 2026-03-23 Compact SaaS Condition Bar
- When users say the previous overall style was fine and only the draggable controls needed work, do not keep pushing a full shell redesign. Narrow the scope back to the drag controls and their immediate container.
- High-frequency condition bars should default to SaaS-style compactness: minimal outer framing, almost no explanatory copy, and controls that read as filters first, cards second.
- If a design pass introduces bigger borders, extra titles, and explanatory paragraphs into a query bar, that is usually the wrong direction for admin/workbench UI. In dense business screens, the right move is often subtraction rather than more polish.

## 2026-03-23 Tab Restore And No Shell Border
- When a user asks for tabs to go back to the previous style, do not interpret that as 鈥渕ake them smaller.鈥?In workbench screens, 鈥減revious style鈥?often means stronger active-state recognition and clearer hierarchy, not less UI.
- Any dark or primary-filled tab/background must default to white text. Relying on inherited foreground colors is too fragile once tab styles are adjusted repeatedly.
- For drag-heavy workspaces, the outer region should not look like a card if the user wants to 鈥渄irectly drag layout.鈥?Keep the control items themselves styled, but remove the surrounding shell border/background chrome first.

## 2026-03-23 Final UI Corrections Need Literal Reading
- When users enumerate UI issues line by line, do not keep inferring 鈥渟tyle direction.鈥?Apply the literal corrections first: remove the exact extra elements they named.
- Resize HUDs and tick rulers are easy to over-justify, but if users want a plain workbench they should disappear from the visible UI even if the resize math stays intact.
- If a tab is already color-filled, any non-white active text is a readability bug. Treat that as a correctness issue, not a design preference.
- In drag-first workbenches, visible handle glyphs are optional. If the whole control is draggable and users say the dots are noisy, remove them.

## 2026-03-23 Condition Bar Action Contrast And Density
- In dense workbench toolbars, every primary-filled control must explicitly enforce white text. Relying on shared button variants is too fragile once local styling changes start layering on top.
- Empty condition controls should not fake sophistication with gray placeholder bars. If users want a high-end enterprise feel, the better choice is a clean empty shell with only the minimum iconography needed.
- Horizontal spacing in condition rows must be tuned against the real data-entry canvas, not left at default gaps. Even a `gap-3` row can read as wasteful once controls are already compact.

## 2026-03-23 Condition Control Whitespace Is Mostly Label And Resize Reserve
- When a condition control still looks loose after border and gap cleanup, inspect fixed label width and text alignment before touching outer width. A right-aligned 42px-plus label slot creates obvious dead air in front of short field names.
- Large `pr-*` values combined with a wide absolute resize handle make the control tail look empty even when the resize affordance is visually subtle. Keep the resize hot zone small enough that it does not read like reserved blank layout.
- Top filter bars and row workbench controls must share the same density rules. Tightening only one branch leaves the screen feeling inconsistent and users will continue to perceive the overall control system as too loose.

## 2026-03-23 Top Filter Density Needs Width Rebalancing, Not Just Padding Cuts
- If a top filter label starts truncating after whitespace reductions, do not simply widen the label slot in isolation. Rebalance total control width and label width together so the label can finish while the control body still shortens.
- In compact filter bars, width formulas are product decisions. A `+24` style buffer may look harmless in code but becomes obvious tail slack when the control preview itself is intentionally empty.
- When users complain about the second control looking too far away, treat it as a total-width issue first. Internal preview emptiness and inter-item gap both matter, but overshooting control width is usually the dominant reason the row reads stretched.

## 2026-03-23 Top Filter Needs Content-Driven Labels
- If users still say 鈥渘o change鈥?after numeric density tweaks, the top filter label should stop depending on a tiny fixed-width slot. Let short and medium field names size to content up to a sane cap.
- For empty-shell condition previews, shrinking the preview body is more effective than endlessly trimming label padding. The tail of the control is what visually pushes the next control too far away.
- When only the top filter row is wrong, isolate it. Reusing the same width formula as the lower workbench can keep reintroducing the same stretched feel in the visible header strip.

## 2026-03-23 Verify The Actual Visible Branch Before Tuning Widths
- In this screen there are multiple condition-like rows with similar markup. Before changing width formulas, confirm whether the user is looking at `document-filter-*` or `condition-item-*`; otherwise a visually correct patch can land on the wrong branch and appear to have no effect.
- Accessibility snapshots and DOM class names are the fastest way to disambiguate duplicated UI patterns. If the rendered node class is `condition-item-label-*`, keep all spacing work inside the condition workbench branch instead of the top filter helper.

## 2026-03-23 Native HTML Drag Is The Wrong Fit For Visible Sortable Controls
- If users need the control to visibly follow the cursor during reordering, native HTML5 `draggable` is the wrong baseline. Its ghost image and browser-managed behavior make the UI feel detached and sticky.
- For a dense sortable workbench, drag feedback belongs inside the page: mirror element, insertion cue, and stable spacing. If those matter, isolate that branch and move it to a page-level drag system instead of stacking more fixes on top of `onDragStart/onDrop`.
- Resize handles on compact controls should sit on the border edge, not inside the content box. Internal resize affordances read as wasted padding before they read as interaction.
## 2026-03-23 Fix The Exact Business Branch Before Polishing
- When the user explicitly says 鈥滈噸鐐圭湅鐪嬪熀纭€妗ｆ鐨勬潯浠垛€? stop broad visual tuning and isolate that exact branch first. Improvements on similar-looking rows elsewhere still count as a miss if the visible business area does not change.
- In dense workbenches, 鈥滈棿璺濆お澶р€?usually means the combined result of item gap, trailing resize reserve, and drag affordance padding. Treat those three as one density problem instead of tuning only a single class.
## 2026-03-23 Resize Can Be Broken Even After Sort Drag Is Fixed
- Fixing reorder drag with `dnd-kit` does not mean width resize is solved. For workbench controls, verify resize separately with a real mousemove check; drag sorting and border resize are two different interaction chains.
- If a resize handle sits inside a draggable item, explicitly exclude that handle from drag activation. Otherwise users will grab the border expecting width changes and instead trigger item dragging.
- Never cap the rendered control width far below the configured resize max. A hidden visual cap makes resize feel dead even when the state math is still running underneath.

## 2026-03-23 Condition Resize Must Stretch The Inner Preview Too
- When users say the resize feels abrupt even after the outer shell follows the cursor, inspect the inner preview width classes before touching drag math again. A fixed preview slot can make a correct resize still look broken.
- In compact condition controls, the rendered width is the combination of label slot and preview slot. If only the container width grows while the preview remains fixed, users will read the extra area as wasted blank space.
- For `condition` mode previews, prefer letting the preview shell consume the remaining width derived from the active resize state. Rebuilding the preview component is usually unnecessary if its internal root already uses `w-full`.

## 2026-03-23 Drag Overlay Can Be Visually Wrong Even If Sorting Works
- If users say the dragged control floats to one side of the cursor, do not keep tuning spacing or activation distance first. Measure the actual pointer position against the rendered drag mirror and verify whether the overlay anchor is wrong.
- In dense horizontal workbenches, a `DragOverlay` with fixed positioning can still feel detached inside complex shells. If the mirror anchor is off, prefer moving the dragged item itself with `dnd-kit` transform so the cursor and control stay visually attached.
- When the user asks 鈥滄槸涓嶆槸鐢ㄧ殑 dnd-kit鈥? answer concretely from the code and package state. For this branch, that means checking `@dnd-kit/core` plus the actual `DndContext/useDraggable` path, not guessing from behavior.
## 2026-03-24 Cross-Row Drag Can Accidentally Apply Scale
- In `dnd-kit` workbenches, do not assume the drag transform is only translation. When the active drop target is a full-width row lane, `scaleX/scaleY` can appear in the transform and make the dragged control suddenly balloon.
- If a dragged item becomes huge or seems to vanish only when crossing rows, inspect the live transform matrix first. A row-sized scale factor can create both symptoms at once.
- For compact business controls, the safer default is to render drag movement with translate-only styling unless scaling is intentionally designed. That keeps cross-row movement stable and avoids giant row-width drag mirrors.
## 2026-03-24 Cross-Row Visibility Is A Separate Problem From Scale
- Fixing cross-row scaling does not guarantee the dragged control stays visible. If users still say 鈥渄ragging downward disappears,鈥?inspect ancestor overflow clipping after the transform has already been corrected.
- In row workbenches, `overflow-x-auto` is risky for drag interactions because it can effectively clip vertical overflow while the item is being translated into another row. Keep drag lanes visually scrollable only if the dragged element itself is no longer clipped by that lane.
- When users ask to make main-table and detail configuration 鈥渦se the same style and effect as conditions,鈥?treat that as a system-consistency request, not a local styling nit. Confirm whether those branches are still using native HTML5 drag before claiming the interaction language is unified.

## 2026-03-24 Drag Hit Area, Main Form Parity And Detail UI Subtraction
- When a user says a condition control can only be dragged from the leading text, treat that as a hit-area bug, not a styling preference. The whole control body should be draggable, and only the explicit resize strip should keep width-drag ownership.
- If the user says the bill head controls must be 鈥渆xactly the same鈥?as the archive condition controls, do not settle for visual similarity. Reuse the same compact workbench language and interaction pattern instead of maintaining a second near-match branch.
- For archive detail configuration screens, 鈥渢oo ugly / too flashy / too many unnecessary elements鈥?means the fix is subtraction first: remove redundant badges, summary cards, decorative rails, and explanatory chrome before adding any new styling.
## 2026-03-24 Memo Hoisting Can Break Runtime Before Type Check Notices
- In a giant function component, moving a `useMemo` earlier can trigger Temporal Dead Zone failures if the memoized code calls helpers backed by later `const` declarations. `tsc` and `vite build` can still pass while the page crashes at runtime.
- For shared numeric helpers such as `clampValue`, prefer module-level function declarations before introducing early memoized derivations. That removes initialization-order risk and keeps later refactors safer.
- After any performance refactor that reorders derivations, verify the real page in a browser. Static build success is not enough for this file.
## 2026-03-27 Lazy Module 500 Often Means Source Or Dependency Breakage
- 濡傛灉 Vite 鍦ㄦ祻瑙堝櫒閲屾姤 `Failed to fetch dynamically imported module`锛屼笉瑕佸厛鎶婂畠褰撴垚璺敱鎴栧悗绔棶棰樸€傚厛鐩存帴妫€鏌ュ搴旀噿鍔犺浇 TSX 鏂囦欢鏈韩鑳藉惁琚В鏋愶紝鍐嶆牳瀵瑰畠寮曠敤鐨勭涓夋柟鍖呮槸鍚︾湡鐨勮鍦?`node_modules` 閲屻€?- 鎳掑姞杞藉垎鏀殑婧愮爜鏂鍜岀己澶变緷璧栧彲浠ュ彔鍔犲嚭鐜帮細鍏堜慨璇硶锛屽啀琛ヤ緷璧栵紝鍐嶅悓鏃堕獙璇?`lint/build` 涓?dev 妯″潡 URL 鏄惁杩斿洖 `200`锛岃繖鏍锋墠鑳界‘璁ゆ暣鏉″姩鎬佸鍏ラ摼鎭㈠銆?
## 2026-03-25 Login Route Must Not Eagerly Import Dashboard
- When the login route and the dashboard route share one entry component, avoid statically importing the entire dashboard module at the top of `App.tsx`. A runtime failure anywhere in the dashboard dependency chain can blank the login page before it even gets a chance to render.
- Protected or heavyweight workbench branches should be lazy-loaded and wrapped with a local error boundary. That keeps public entry screens recoverable even when downstream module-setting code is unstable.
- A passing `vite build` does not prove the safe route is isolated. Real startup verification should include the unauthenticated path, not just the dashboard path.

## 2026-03-25 Backend Envelope Mismatch Can Crash The Login Route
- Before trusting a backend list endpoint as `T[]`, check the real payload shape. This backend returns `{ code, message, data }`, so treating the whole response as an array will blow up immediately on calls like `.find()` and `.map()`.
- Fix response-shape mismatches at the request layer first. Central envelope unwrapping in `http.ts` is safer and less repetitive than patching each screen one by one.
- Public entry screens should still keep lightweight `Array.isArray` guards around remote lists. Even with a normalized request layer, malformed or partially migrated endpoints should not be able to blank the whole page.

## 2026-03-25 Field Type Dropdown Must Follow Backend Options, Not Local Labels
- If the backend already exposes `fieldsqltag-options`, the inspector dropdown should display those option rows directly. Keeping a separate local `鏂囨湰/鏁板瓧/涓嬫媺妗哷 list for one branch creates immediate inconsistency.
- For condition configuration, current type recovery must read `controltype/controlType` in addition to `fieldsqltag/fieldSqlTag`; otherwise the dropdown cannot correctly show the persisted selection.
- When both backend `showname` and local fallback labels exist, prefer the backend label first. Fallbacks should only cover missing or malformed option rows, not override valid server metadata.

## 2026-03-25 Detail Columns Can Already Be Loaded But Still Disappear At Render Time
- When a user says 鏄庣粏鍒楁帴鍙ｅ凡缁忔湁鍊间絾鐣岄潰娌″叏鏄剧ず, do not stop at the fetch branch. For this workbench, detail columns were already loaded from `single-table/modules/{dllCoId}/fields`; the loss happened later in the table-builder render filter.
- `MemoTableBuilder` falls back to `helpers.isRenderableColumn(column)` unless a branch explicitly passes `renderableColumns`. That generic rule currently hides `visible=false` and `width<=0`, which is correct for the main table but wrong for detail screens that must expose all backend fields.
- For branches that need to show every returned field, prefer passing explicit `renderableColumns` instead of weakening the shared global visibility rule. That keeps the fix scoped and avoids regressing the main table.

## 2026-03-25 Archive Layout Editor Needs Its Own Field Source
- If the user points at the archive layout editor's right-side field list, do not assume it should keep reusing `mainTableColumns`. That workbench has a dedicated backend source: `single-table/modules/{dllCoId}/designer-controls`.
- For layout-only field pools, keep the fetch and mapping inside `src/features/dashboard/module-settings` instead of pushing another special-case branch into `Dashboard.tsx`. The main page should only pass module-level coordination inputs such as `currentModuleCode` and toast handlers.
- When replacing the layout editor field source, prefer merging designer-control rows with existing main-table field metadata. That preserves preview/type behavior while still switching the source of truth for layout width, height, and palette membership.

## 2026-03-25 Archive Layout Groups Must Follow Designer Groups Too
- Once the layout editor field pool switches to `designer-controls`, do not leave the group canvas on the old front-end-only `currentDetailBoard.groups` assumption. The backend already exposes the matching group source through `single-table/modules/{dllCoId}/designer-groups`.
- `designer-groups` and `designer-controls` should be mapped with the same field identity strategy; otherwise the right-side palette and the group canvas will talk about different field IDs and drag assignment will drift.
- For this editor, the safest pattern is to load both sources together inside the module-settings feature and hydrate the editor state once on open. That keeps the modal internally consistent without turning the whole dashboard state tree into a special-case designer mode.

## 2026-03-25 Designer Group Fields Are Not Always The Real Membership Source
- When the user explicitly says 鈥滄帶浠跺睘浜庡摢涓垎缁勬槸閫氳繃浣嶇疆璁＄畻鐨勨€? stop trusting `designer-groups.fields` as the authoritative membership list. That service-level nesting may be a convenience view, but the real source of truth for layout editors can still be the separate `designer-layout` coordinate table.
- For Delphi-style layout data pulled via `select *`, treat group rectangles and control rectangles as separate datasets. Use `designer-groups` for the group boxes, `designer-layout` for placed controls, and derive membership from rectangle containment instead of assuming backend-attached children are correct.
- When a backend table is exposed as raw records, build field-name readers that tolerate historical casing and synonyms (`left/top/width/height`, `controlLeft/controlTop`, etc.). Otherwise the logic can look correct in code but silently produce empty groups at runtime.

## 2026-03-26 Single-Table Module Settings Must Be Gated By Menu Persistence
- In this wizard, 鈥滆彍鍗曚俊鎭凡寤哄ソ鈥?is stronger than 鈥滃綋鍓嶅湪绗?2 姝ョ偣杩囦繚瀛樷€? The safe gate is whether a real menu node already exists and has a stable `menuId + purviewId/moduleCode`; otherwise users can jump from steps 3/4 into module settings with no durable module identity.
- If the single-table parent record may not exist yet, do not let every child loader (`fields/conditions/details/menus/colors`) race ahead and fail independently. Add one module-level ensure step first, then start the child-resource effects only after that record is ready.
- When a hook performs backend bootstrapping, avoid depending on unstable inline callbacks like a freshly recreated `showToast`. Either memoize the callback or keep it out of the effect dependency loop, or the bootstrap request can repeat unexpectedly.

## 2026-03-26 Single-Table Save Contract Is POST-Upsert Plus DELETE
- For this backend, do not keep assuming a REST-style split of `POST=create` and `PUT=update`. The real write contract is resource-level `POST` upsert: no `id` means create, with `id` means save/update, and deletion stays on `DELETE`.
- Once the user provides the real write contract, stop extrapolating missing interfaces from old controller reads or earlier assumptions. Save-plan analysis should immediately pivot to the user-confirmed contract, even if it differs from previous code reading.
- Under this contract, the front-end save orchestrator's main job is to classify each record into `create / update / delete`, not to choose among many HTTP verbs. Build the diff logic around record identity first, then map creates/updates to `POST(with/without id)` uniformly.

## 2026-03-26 Detail Save Target Depends On UnionModule
- For single-table detail resources, do not treat all detail columns/colors/menus as local detail data by default. The exact split must follow the user's latest interface mapping, not an earlier paraphrase.
- In the latest confirmed rule, detail columns, detail colors, and detail menus all move to the related module root when `UnionModule` is present, using the main-module `fields/colors/menus` endpoints with `dllCoId = UnionModule`.
- For branches the user re-explains with concrete endpoint lists, trust the explicit endpoint mapping over the earlier natural-language summary. Restating a rule loosely can easily drift from the real API contract.
- Chart config is a separate branch from detail columns/colors/menus. Even when a detail has `UnionModule`, chart save still belongs to the current detail unless the user explicitly redefines that rule.
- When the user says 鈥滃厛涓嶇甯冨眬缂栬緫鍣ㄩ噷鐨勪繚瀛樷€? remove designer-layout from the current save scope instead of leaving it half-included in the plan. Partial inclusion is worse than explicit exclusion for a multi-resource save workflow.
## 2026-03-26 Merge Platform Entry Must Not Replace The Existing App Shell By Default
- If the active branch is still a single-entry login/workbench product, do not let a merge silently replace `src/App.tsx` with a multi-platform router. Preserve the current product entry unless the user explicitly asks to migrate routes.
- When a user reports the main page suddenly looks broken right after a merge, inspect the app entry and current browser path before touching component styles. A redirect from `/` to `/design` can look like a layout failure while the real issue is simply the wrong shell.
- Before treating post-merge `/api` 404s as a backend regression, clear duplicate local `vite` and `tsx watch` processes. Stale dev servers can keep serving old route behavior and make proxied API paths fall back to `index.html`, which masquerades as a code bug.

## 2026-03-26 Default Object Props Can Trigger Infinite Dashboard Effects
- In `Dashboard`, do not use an object literal like `routeContext = {}` as a function-parameter default when downstream effects depend on that value. A new object is created on every render, so any effect keyed by `[routeContext]` will rerun forever.
- If a page-level prop is optional but used as an effect dependency, default it to a module-level stable constant or normalize it with memoization before wiring effects to it.
- When the browser network panel shows the same menu endpoints looping with no user interaction, inspect top-level optional object props first. An unstable default prop can look like a state-flow bug even when the effect bodies themselves are correct.

## 2026-03-26 Module-Settings Effects Must Not Reload From Their Own Hydration State

## 2026-03-27 Persisted Detail Resources Must Diff By Identity Before Body Fingerprints
- If a detail color/menu row already has a real backend `id`, do not rely only on whole-collection body fingerprints to decide whether the resource changed. Object-shape drift between baseline and current state can still make the collection look different even when each persisted row is logically identical.
- For persisted collections, prefer matching rows by stable identity first and then comparing the actual backend save body. Body-fingerprint equality should stay as a fallback for rows that genuinely do not have stable keys yet.
- Apply the same identity-first rule both inside the per-row save helper and in the outer `changed` gate. If the outer gate still uses a weaker comparison, unchanged detail menus/colors can continue to enter the save branch and spam `POST` calls even though row-level bodies match.
- In the module-settings step, avoid wiring resource-loading effects to collection objects that the same effect hydrates, such as `detailTableConfigs` or `detailTableColumns`. If an effect fetches menus/colors and then immediately writes those collections back, using them as dependencies will create a fetch loop.
- When a loader only needs the latest helper callback or latest column snapshot during merge/capture, keep that value in a ref and read `ref.current` inside the effect. Do not let callback identity churn or large mutable collections decide whether the network request should run again.
- For related-module detail hydration, separate "when should we refetch" from "what helper logic do we use during this fetch". A callback like `resolveDetailModuleSnapshotByCode` can legitimately depend on many states, but those dependency changes should not automatically retrigger the parent detail-loading effect unless the fetch inputs themselves changed.

## 2026-03-26 UI Editors Must Follow The Backend Table Shape When The User Gives It Explicitly
- If the user provides the exact table structure for an editor page, stop preserving older front-end abstractions like `field/operator/value` just because they still "sort of work". The form should be realigned to the backend field model, not wrapped in a second invented rules vocabulary.
- For color rules, the authoritative editing model is the single-table color table fields (`condition`, `forcecolor`, `backcolor`, `useflag`, `dfcolor`, `dbcolor`, style flags, `fontsize`). Any extra UI-only fields such as `label`, `disabled`, `textColor`, or `backgroundColor` should be treated as compatibility/preview helpers, not the primary schema.
- When fixing schema drift in an editor, update all three layers together: default object builder, API-to-state mapper, and the editor component itself. Fixing only the form labels leaves newly created rows and loaded rows speaking different field dialects.

## 2026-03-26 Save Bodies Must Not Spread The Entire UI Edit Object
- When a save mapper starts with `...cloneValue(record)`, treat that as a red flag for schema drift. It almost guarantees UI-only fields (`name`, `type`, `width`, flags, helper IDs) will leak into backend POST bodies sooner or later.
- For pages where the user already gave the database structure, save mappers should be explicit allow-lists, not merge-based transforms. Build the POST body field by field from the backend schema and map UI aliases onto it deliberately.
- Be careful with precedence when the UI renames a field. In the condition editor, the editable label lived in `name`, but the persisted field was `controlLabel`; preferring the old backend field over the edited UI value silently discarded the user's change.

## 2026-03-26 For normalizePersistedValues Endpoints, Let Backend Defaults Own Relationship Keys
- If a backend save endpoint simply feeds the request through `normalizePersistedValues(tableName, body, columnLookup)`, the front end should send only the raw database columns it truly wants to persist. Do not also spread the whole editor object "just in case".
- For tables that generate relationship keys server-side, avoid synthesizing those keys from front-end temp IDs. In the single-table detail editor, sending a guessed `tabkey` from a temporary tab/form ID was more dangerous than omitting it and letting the backend apply its default module form key.
- The same rule applies to generated field identifiers. If `fieldkey` is missing for a newly added field, do not fall back to unrelated UI state like `formKey`; leave it blank and let the backend create the canonical key.

## 2026-03-26 React Vendor Chunk Matching Must Be Exact
- In `vite.config.ts`, never classify the React runtime chunk with a broad rule like `id.includes('react')`. That will accidentally catch packages such as `react-rnd` or `lucide-react`, and Rollup can split them into a `react-vendor` chunk that later depends back on `vendor`.
- When a production bundle throws `Cannot read properties of undefined (reading 'memo')` from a vendor chunk, inspect the built chunk import graph before touching app code. A `vendor <-> react-vendor` cycle can leave React exports uninitialized even though `vite build` succeeds.
- For manual chunking, match only the real runtime packages (`react`, `react-dom`, `scheduler`) using normalized `node_modules` paths. Everything else in the React ecosystem should stay in its own explicit bucket or fall back to `vendor`.

## 2026-03-26 Save Orchestrators Should Not Upsert Baseline-Identical Rows
- A save orchestrator that blindly `POST`s every current row is only half-finished, even if the backend supports upsert. Users will immediately notice unchanged resources still hitting write endpoints, and that noise makes later save debugging much harder.
- For resources that already keep an entry baseline, compare the normalized POST body against the baseline body before writing. If they are identical, reuse the baseline row locally and skip the network request.
- When building diff-by-body logic, define a stable identity key first (`id`, then durable business key like `fieldKey`). Without a stable match key, a harmless reorder or remap can look like a delete-and-recreate of every row.
- Do not stop after fixing just one resource branch if the save orchestrator still uses the same unconditional-upsert pattern elsewhere. Once a user reports 鈥渘othing changed but save still posts鈥? audit the whole save path in the current page and convert the repeated resource loops together.
## 2026-03-26 Existing AI Endpoints Must Follow The Same Auth Contract
- Once the backend confirms `/api/ai/*` uses the existing login system, do not patch only the single button the user just reported. Audit every currently wired AI request in the shared client and bring them onto the same auth-aware request layer together.
- In this project, the safest default is to route AI calls through `apiRequest(..., { auth: true })`, so `Authorization: Bearer <accessToken>` stays consistent with the rest of the app and the proxy/response unwrapping behavior does not diverge.
- When the user provides explicit curl samples for health, survey, SQL draft, translate, and create-table, treat that as the canonical contract. Any remaining raw `fetch('/api/ai/...')` calls are debt to remove, not harmless variation.

## 2026-03-26 AI Contract Changes Must Update Proxy Configuration Too
- When the user confirms that `/api/ai/*` has moved onto the main Java backend, do not stop after updating frontend request headers. Audit the dev proxy and IIS reverse-proxy rules too, or the browser can still hit a stale sidecar target and mask the real fix.
- A direct `curl` to `9093` succeeding while the browser path `3000/api/ai/*` returns `500` is a strong sign of stale proxy routing, not necessarily an application bug. Check `vite.config.ts`, `public/web.config`, and recent proxy error logs before touching request payloads.
- In this repo, `ECONNREFUSED 127.0.0.1:3001` inside `.codex-dev.log` is a concrete signature that `/api/ai/*` is still being sent to the deprecated local AI server. Treat that as a routing bug first.

## 2026-03-26 Main-Field Save Mappers Must Prefer The Current UI Alias Over Stale Backend Mirrors
- When a field row simultaneously carries UI-editable aliases (`name`, `sourceField`, `placeholder`, `defaultValue`) and hydrated backend mirrors (`displayName`, `fieldName`, `promptText`, `defaultDate`), save mappers must prefer the current UI alias first. Otherwise users can edit the form and still post the old hydrated value back.
- This class of bug is subtle because the save request still succeeds; the signal is "I changed the column property but it didn't save" even though a `POST /fields` happened.
- For the single-table main-field table, keep `name -> username1`, `placeholder -> prompttext`, and `defaultValue -> defaultdate`, but treat `sourceField` as backend `fieldname` itself. If `fieldname` is empty, leave it empty on both read and save instead of backfilling from `sysname` or `fieldKey`.

## 2026-03-26 Shared UnionModule Save Diff Needs One Consistent Representative Baseline
- When multiple detail tabs point at the same `UnionModule`, do not let one tab provide the current rows while another tab provides the baseline rows. That mismatch makes unchanged shared menus/colors look like a full rewrite on save.
- Aggregate one representative snapshot per related module and keep its current rows and baseline rows together. A practical rule is "prefer the active detail tab; otherwise prefer the snapshot with the richest field/menu/color data".
- If a save bug shows many `menus` writes after editing an unrelated column, inspect the shared-module aggregation first. The body mapper may be fine while the representative baseline selection is wrong.

## 2026-03-26 Main Field Save Must Follow p_systemwordbooktab Raw Columns
- For single-table main fields, do not keep diffing and saving against invented aliases like `isvisible`, `isreadonly`, `isquery`, `prompttext`, or `helptext` once the user has given the real table structure. The persisted contract belongs to `p_systemwordbooktab`, so the save body should use raw columns such as `vislble`, `edit`, `tagid`, `ifSearch`, `bak`, `fieldsql`, `InputHintText`, and `dataAlign`.
- Fix the read side and write side together. If the loader reads one alias family but the saver writes another, users will see either false "unchanged" comparisons or successful requests that still do not reflect the edited value after reload.
- When a user says "the column property did not save" and no `fields` request fires, first check whether that property actually maps to a legacy DB column name instead of assuming the diff logic itself is wrong.

## 2026-03-26 Popup Menu Diff Needs Stable Persisted IDs Before Weak Business Keys
- For right-click menus, always preserve the backend `id`/`backendId` when normalizing fetched rows. If a persisted row falls back to a temporary front-end ID, unchanged rows can be mistaken for creates during save.
- A fallback identity built only from `tab + menuName + dllName` is too weak for legacy menu rows. Include additional stable fields like `menuid`, `action`, and `actiontype` before trusting the comparison.
- When a save path unexpectedly writes many `menus` rows after an unrelated field edit, inspect menu normalization first. The actual issue may be lost persisted IDs rather than the save loop itself.

## 2026-03-27 Resource Collections Need A Whole-Collection Equality Gate Before Row-Level Upsert
- For legacy editors with shared resources (`UnionModule` colors/menus, detail decorations, main-table menus), row-level identity matching is not enough on its own. If the whole collection's backend-field bodies are unchanged, short-circuit the entire save branch before attempting per-row upsert.
- This collection-level equality gate is especially valuable when rows are normalized through UI-specific adapters. Even if some temporary IDs or derived display fields drift, unchanged backend payloads should not trigger a write.
- Color rule save mappers must stay on an explicit backend-field allow-list. Reintroducing `...cloneValue(record)` into a color body will make collection equality noisy again and can resurrect false `colors` writes after unrelated edits.

## 2026-03-27 Detail Resource Saves Need A Branch-Level No-Op Gate Before Shared Aggregation
- When a user reports that saving a main-field change still writes many detail `menus/colors`, do not stop at the generic diff helper. Check whether unchanged detail tabs are still entering the shared/local save branch before diffing even starts.
- For detail resources, add the no-op check at the detail-branch level: compare the baseline and current collections using the exact backend save body for that branch, and skip aggregation entirely when nothing changed.
- This is especially important for `UnionModule` details. If unchanged detail tabs are still aggregated into the shared-module map, later collection-level diffing may still execute repeated writes or deletes because the branch itself should never have been entered.

## 2026-03-27 Detail Save Branches Must Diff Columns, Colors, And Menus Independently
- After a branch-level gate is in place, do not assume that entering the branch means every resource inside it should be saved. A user can change only a column while colors and menus remain untouched.
- For single-table detail saves, compute `columnsChanged`, `colorsChanged`, and `menusChanged` separately for both local-detail resources and `UnionModule` shared resources. Then call only the corresponding write and delete APIs for the resources that actually changed.
- This prevents a still-dirty column collection from dragging unrelated `colors/menus` into `POST` calls, even if those subordinate resources compare cleanly.

## 2026-03-27 Detail Color And Menu Diff Must Canonicalize Through The Same Mapper First
- Legacy detail editors often hold the same backend row in multiple front-end shapes: freshly fetched DTO shape, normalized inspector shape, and in-memory edited shape. Comparing those raw objects directly is noisy even if the persisted fields are unchanged.
- Before diffing detail `colors/menus` or `UnionModule` shared `colors/menus`, run both baseline and current arrays back through the same normalization mapper (`mapColorRule`, `mapContextMenuItem`) and only then build the backend save body.
- If a user can paste a request payload that matches the backend row by eye but the app still posts it, that is a strong sign the compare step is being fed mismatched UI object shapes rather than real business-field changes.

## 2026-03-27 UnionModule Relation Changes Must Not Imply Shared Resource Writes
- In the single-table detail flow, changing or normalizing the `UnionModule` relation is part of saving the detail record itself. It is not evidence that the related module's fields, colors, or menus were edited.
- Do not include `unionModuleChanged` as a reason to enter the shared-resource save branch. Otherwise a harmless relation normalization can still trigger unrelated `POST /colors` and `POST /menus` for the referenced module.
- Shared resource writes should be driven only by shared resource body differences, not by the mere fact that a detail points at that module.

## 2026-03-27 Shared UnionModule Resources Need The Same Authoritative Baseline Fallback As Local Detail Resources
- Fixing local detail `colors/menus` diff is not enough when the same data can also be saved through the `UnionModule` shared-resource branch. If only the local branch uses an authoritative backend re-read, unchanged shared menus/colors can still be posted from stale in-memory baselines.
- For shared module resources with persisted rows, re-read the authoritative module `colors/menus` before writing whenever the normalized compare says they changed. If the freshly fetched backend rows are equivalent to the current UI state, treat the branch as unchanged and skip `POST`.
- When a user keeps pasting the exact same `menus/colors` payload with a real `id`, assume the remaining bug is "shared baseline drift" before inventing more compare heuristics.

## 2026-03-27 Save-Time Verification Should Reuse Already-Loaded Detail Decoration Snapshots Before Hitting The Network
- Once the editor has already loaded a detail tab's `menus/colors` or a related module's shared `menus/colors`, saving should reuse that in-memory snapshot as the first authoritative baseline. A save button that always re-fetches the same decoration data feels broken to users even if no write occurs.
- Keep two small caches: one keyed by `moduleCode` for shared `UnionModule` decorations, and one keyed by `moduleCode:detailId` for local detail decorations. Save-time diff verification can read these caches before deciding whether a network `GET` is needed.
- Only fall back to live `fetchSingleTableDetailMenus/Colors` or `fetchSingleTableModuleMenus/Colors` when the cache is absent. That preserves correctness without showing needless post-save reads in normal flows.

## 2026-03-27 Survey Main First-Load Query Should Not Overfit Assumed Filters
- When the user corrects the survey first-load query rule multiple times, do not keep layering new filters (`departmentId`, then entry `id`) onto the list request. Step back and align to the actual current contract.
- In this module, the current requirement is simpler: `GET /api/survey/mains` with no query parameters, then take the first row. `departmentId` still belongs to create/save defaults, but not to the initial list query.
- If a feature prop is introduced only to satisfy a guessed query filter and the user later removes that filter, delete the prop chain instead of leaving dead context threaded through the workbench.

## 2026-03-28 Survey Main Schema Changes Must Update Read And Save Mappers Together
- When the backend adds canonical main-table fields for research records, such as `title` or `project`, do not patch only the query side or only the save side. The main DTO, load mapper, save mapper, and save-success rehydration must be updated together.
- For this workbench, backend `title/project` should be wired directly into the existing overview fields that users edit, rather than leaving the UI on old defaults and silently dropping the new values on save.

## 2026-03-28 Loaded Survey Records Must Preserve Persisted IDs Across List And Detail Reads
- If the page first discovers a survey record from `GET /api/survey/mains` and then fetches the full row from `GET /api/survey/mains/{id}`, do not assume the second payload always repeats the same `id` field. Preserve the persisted id from the list row as a fallback, or the editor can display existing data but still save as a create.
- Apply the same rule to detail ids and to mixed `number/string` legacy ids. Diff, hydrate, and delete logic should compare ids by normalized identity, not by a narrow numeric-only filter.
- When a legacy API may serialize the primary key as `ID` or `Id`, normalize that casing at the API adapter boundary instead of hoping each page remembers to read all variants. Otherwise the same persisted row can look like 鈥渓oaded but no id鈥?in one screen and 鈥渉as id鈥?in another.

## 2026-03-28 Explicitly Added Child Rows Must Not Be Dropped Just Because They Are Still Blank
- In editors where users can manually add child rows, do not reuse a pure 鈥渉as meaningful content鈥?filter as the only save gate. A user-added blank row is still an intentional row and should usually be persisted, or at minimum preserved through save.
- Keep a small explicit-persist flag on newly added rows when the product expects 鈥滄柊澧炴槑缁嗏€?to create real child records under the parent, even before the user fills every field.

## 2026-03-28 After Batch-Saving Child Rows, Reload The Whole Child Collection
- When a parent page can save multiple child rows in one action, do not stop at stitching together the per-row save responses. The authoritative post-save state is the full child list under that parent, so reload it and rehydrate from the collection endpoint.
- This is especially important when the backend may assign defaults, reorder rows, merge payloads, or return partial DTOs from save endpoints. A collection re-read after save is more reliable than guessing from local optimistic state.

## 2026-03-28 Legacy Detail DTOs Need Full Field-Name Normalization, Not Just ID Normalization
- When a legacy detail API returns database-style column names like `billno`, `mid`, `modulename`, `moduleid`, `Position1`, or `Working_rate1`, normalizing only the primary key is not enough. The adapter must map the whole row into the front-end field vocabulary or the form will save successfully but re-render blank.
- Put that mapping in the shared API adapter layer so list read, single-row read, and save-response hydration all agree on the same canonical detail shape.

## 2026-03-28 Legacy Main DTOs Need The Same Full Field-Name Normalization And Semantic Mapping
- For research-record main rows, do not stop after wiring `title/project`. Legacy responses can still use column names like `departid`, `surveydate`, `Address`, `ordernum`, `empnames`, `Positionsbak`, `operatedate`, and `operatorname`.
- Normalize those names in the shared survey adapter, and keep the UI-to-backend semantic mapping explicit: `surveyUsers` belongs to the 鈥滆皟鐮斿伐绋嬪笀鈥?field, while `operatorName/operateDate` belong to the output-confirmation signer/date fields.

## 2026-03-28 Survey Main Form Fields Must Follow Backend Semantics, Not Convenient Fallbacks
- When a main form shows both 鈥滆皟鐮斿伐绋嬪笀鈥?and 鈥滆緭鍑虹‘璁ょ瀛椾汉鈥? do not fill both from the same `surveyUsers` source just because it makes old records look less empty. That creates silent write-back drift.
- In this workbench, `surveyUsers` should own the overview engineer field, while `operatorName/operateDate` should own the output-confirmation signer/date. Any fallback between them must stay clearly secondary and only for backward compatibility during read.

## 2026-03-28 Department Pickers Must Persist Backend IDs, Not Just Display Names
- If the backend contract says a department field stores `Departmentid`, do not keep the UI on a plain text box that only edits `departmentName`. A page that displays the right label but drops the foreign key will drift on save and reload.
- For this research-record workbench, treat the department search result as a pair: show `departmentname`, persist `Departmentid`, and when the main row reloads with only `departid`, resolve the label from the department source before rendering.

## 2026-03-28 Search-Backed Department Fields Must Not Sneak In Login Defaults
- Once a department field is changed to a real search picker, do not keep preselecting the login department id or the current menu name as a silent default. That makes the screen look filled even when the user never chose a department.
- In this research-record workbench, a new record should leave 鈥滆皟鐮旈儴闂ㄢ€?empty until the user selects one, while existing records may still hydrate from the saved `departid`.

## 2026-03-27 Preview And Export Should Share One Research Word Template Source
- When the user asks for Word export to match the right-side preview 鈥滀竴姣斾竴鈥? do not keep two separately maintained template trees and try to visually sync them by hand. That always drifts.
- In the research-record module, the durable fix is to extract one shared page builder and one shared CSS source, then let both the browser preview and the `.doc` export consume that same template.
- This does not guarantee Microsoft Word鈥檚 rendering engine matches the browser pixel-for-pixel, but it removes the self-inflicted drift where preview and export already disagree before Word gets involved.

## 2026-03-27 Export Fidelity Must Not Regress The Existing Preview
- If the user says the right-side preview was changed by an export-fidelity refactor, stop optimizing the export path first and restore the preview. The visible in-app preview is the product surface; it must not regress just to make export plumbing cleaner.
- In this research-record module, 鈥渟hared template鈥?is only acceptable if it preserves the original preview layout exactly. Once the user notices style drift, the safer approach is to restore the preview component and make the export template follow it.
- For Word exports, border visibility is a separate compatibility problem. Solve it with Word-friendly table attributes/inline border styles instead of changing the preview DOM/CSS just to satisfy Office rendering quirks.
## 2026-03-28 Designer Workbenches Must Not Let Legacy Local State Block Authoritative Backend Layout Data
- If a layout workbench is re-pointed to dedicated backend designer endpoints, do not keep the old 鈥渉as local enabled state, so skip loading鈥?guard. In this archive layout flow, `currentDetailBoard.enabled` was enough to prevent `designer-controls / designer-groups / designer-layout` from ever becoming the real initial state.
- Query-side normalization and save-side serialization for designer data should live in one shared adapter. The same feature needed Delphi-era field identity matching, group-rectangle assignment, and absolute coordinate save bodies; scattering those rules across hooks and save functions makes regressions likely.
- When backend only exposes group loading but not group persistence, control-layout saves must still account for unassigned fields explicitly. Parking unassigned controls outside every group rect is safer than omitting them and letting stale persisted positions pull them back into the wrong group on the next reload.
## 2026-03-28 Designer Workbenches Need Their Own Save Boundary
- If a modal workbench edits a dedicated backend resource such as `designer-layout`, do not piggyback that persistence onto a broader page-level save just because a shared save hook already exists. Give the workbench its own explicit save action and keep the request boundary visible to the user.
- In this archive layout flow, the correct split is: main module fields/conditions/menus save through `saveCurrentPage`, while definition-design coordinates save only from the layout modal's own button.
- Once a workbench gets its own save entry, remove the same persistence from the page save path in the same change. Leaving both paths active creates duplicate requests and makes Network debugging misleading.
## 2026-03-28 Designer Modal Loads Must Not Depend On Unstable UI Callbacks
- If a modal loader both fetches backend data and writes the result back into parent UI state, do not let the fetch effect depend on un-memoized callbacks such as `onUpdateDetailBoard`. In this archive layout flow, the effect re-fired after its own successful state patch and created a tight `designer-controls / designer-groups / designer-layout` request loop.
- The safer pattern is to split the flow in two: fetch raw backend payload on modal-open or module-change only, then map that payload to current UI columns in local memo/effects without re-hitting the network.
- For cross-layer callbacks like toast handlers or detail-board patchers, prefer ref indirection inside loader hooks when the network trigger should be controlled by route/open state rather than by parent render frequency.
## 2026-03-28 IIS Same-Origin Releases Must Neutralize Browser Origin Before Proxying To Legacy APIs
- If the production bundle already uses same-origin `/api/*`, an `Invalid CORS request` after deployment is often not a front-end base-url bug. Check the IIS reverse-proxy layer first.
- For legacy backends that still run their own CORS filter, IIS/ARR may forward the browser's `Origin` header to the upstream service even though the browser is only talking to the same origin site. In that setup, clearing `HTTP_ORIGIN` and the preflight-related request headers in `web.config` is safer than forcing the front end back to cross-origin direct calls.
- When patching release-only proxy behavior, verify the built artifact itself, not just source files. In this repo the root `vite build` currently does not refresh `dist/index.html` and `dist/web.config` reliably, so the final publishable `dist` may need an explicit artifact check or sync step.
## 2026-03-28 IIS Rewrite Fixes Must Respect Server-Level Configuration Boundaries
- Do not assume a site-level `web.config` can safely add `allowedServerVariables` for URL Rewrite. In IIS, that capability may be locked to server-level configuration, and shipping it directly in a deployable package can turn a working site into `500 URL Rewrite Module Error`.
- When a reverse-proxy CORS workaround depends on rewriting request headers like `Origin`, distinguish two layers explicitly: what can be shipped in the app package, and what must be enabled by the IIS server administrator or backend owner.
- If a release hotfix risks taking the whole site down, prefer restoring a rewrite-safe package first, then document the server-side follow-up instead of leaving production on a broken distributed rule.
## 2026-03-28 Definition-Layout Saves Must Persist Group Lifecycle Separately From Control Coordinates
- In this archive layout flow, saving only `designer-layout` is not enough. Group create/update/delete lives in `designer-groups`, and layout delete lives in `designer-layout/{fieldId}`. If the save button ignores those endpoints, the backend keeps stale groups and stale field positions even though the canvas looks updated locally.
- The durable fix is to build one shared save plan from the current detail-board state and the loaded backend source, then execute four buckets explicitly: group save, layout save, layout delete, group delete.
- After any successful designer save, re-fetch `designer-controls / designer-groups / designer-layout` and rebuild local source state from the authoritative backend payload. Hand-patching ids or layout rows after create/update will drift as soon as new groups receive server-generated ids.
## 2026-03-28 Release Packages Must Be Built From A Fresh OutDir, Not A Stale dist Snapshot
- In this repo, a plain `npm run build` may report success while leaving the existing root `dist` directory untouched. Treat `dist` as suspicious if its asset timestamps did not change in the current run.
- Before packaging a release, verify the actual output directory contents, not just the command exit code. A fresh `--outDir` build exposed the real new bundle immediately, while the old `dist` kept shipping yesterday's assets.
- For this project's deployable zip, include both the root app assets and the copied `public/simple-process-designer` subtree. If the zip lacks `simple-process-designer`, it is not the same payload the browser expects in production.
## 2026-03-28 Embedded Process Designers Must Force Same-Origin In Production When No Explicit API Base Is Provided
- For this repo's `simple-process-designer` child app, leaving a localhost dev fallback in the production path is enough to turn the released iframe into a whiteboard. The host page may load `/simple-process-designer/` correctly, but the child bundle can still fail internally if its API base falls back to `127.0.0.1:8080`.
- Treat the embedded designer as part of the same site in production unless an explicit `VITE_API_BASE_URL` is provided. No explicit prod API base should mean same-origin `/api`, not a loopback default.
- When building iframe URLs for released subapps, resolve relative paths against `window.location.origin` explicitly. Relying on `new URL('/child-app/')` without a base is fragile and can break silently across environments.
## 2026-03-28 Local Dev Should Not Assume A Secondary Designer Dev Server Is Always Running
- In this repo, defaulting the process-designer iframe to `http://127.0.0.1:5174` in every dev session makes `npm run dev:client` unusable. If the user only starts the main front end on `3000`, the flow-designer step becomes a guaranteed whiteboard.
- The safer default is same-origin `/simple-process-designer/`, because the main app can already serve the copied child bundle from `public/`. Only the combined dev scripts that explicitly launch the child designer server should override the iframe target back to `5174`.
- When a dev-only override exists, keep it in the launcher scripts rather than in the shared runtime default. That way the product remains usable in the simple one-command front-end workflow, and the full linked dev stack still gets live child-app development when needed.
## 2026-03-28 Embedded Child Apps In Vite Dev Must Use An Explicit index.html Path When The Directory Route Falls Back To The Host SPA
- A same-origin child-app directory like `/simple-process-designer/` is not always safe in local Vite dev. If the dev server treats that path as an SPA route and falls back to the host `index.html`, the iframe can recursively load the entire parent app instead of the child app.
- Before declaring a same-origin iframe path correct, compare the actual responses for both the directory URL and the explicit file URL. In this repo, `/simple-process-designer/` returned the host `Ls AI Platform` shell, while `/simple-process-designer/index.html` returned the real process-designer page.
- The durable default is to point the host runtime at the explicit child entry file, and keep directory-style paths only where the server is known to serve the child app directly.
## 2026-03-28 Module-Setting Operation Buttons Should Reuse Grid Config And Inspector Boundaries
- When a table-like workbench needs fixed operation-button settings such as add/delete/modify/save, render the button strip in the existing shell layer, but keep the editable properties inside the shared right-side inspector instead of inventing a second inline settings area.
- For inherited detail modules, button enable flags belong to the same module-config contract as the main table. If a detail tab is really editing a related module, save those flags through the shared-module save path rather than only mutating the current tab's local grid config.
- A non-configurable button like 鈥滀繚瀛樷€?should still participate in the same selection model so the UI stays consistent, but its inspector state should be locked/read-only instead of pretending there is a backend field to save.
## 2026-03-28 Enable Flags Must Be Normalized To Strict 1 Or 0 At The API Adapter Boundary
- For backend flags like `addEnable/deleteEnable/modifyEnable`, do not let pages independently guess what empty strings, nulls, or odd numeric values mean. Normalize them once in the shared API adapter.
- In this module-setting flow, the product rule is explicit: `1` means enabled, `0` means disabled, and missing/empty values should default to enabled. Saving should therefore always emit `1` or `0`, never blank and never alternative numeric values.
## 2026-03-28 Detail Save Rehydration Must Not Overwrite Freshly Edited Module Flags
- When a detail save response is mapped back into local grid config, do not let broad `...mapped.gridConfig` hydration override user edits that belong to a different contract layer, such as inherited module-level enable flags.
- In this module-setting flow, the right merge order is 鈥渂ackend detail config first, then current local table config, then normalized module-operation flags鈥? Otherwise a detail endpoint that knows nothing about `addEnable/deleteEnable/modifyEnable` can silently reset them back to default `1` before the shared-module save branch runs.
## 2026-03-28 Inspector Copy For Small Setting Panels Should Prefer Local Stable Text Over Upstream Garbled Labels
- If a narrow inspector panel only needs a small amount of copy, do not keep depending on upstream context titles/descriptions once you notice encoding drift or mojibake. A local, stable title/description can be safer than propagating broken strings through multiple layers.
- For compact operation bars, status should be expressed mostly by selection and color, not by stacking more badges and helper text. Once the user asks for a denser control strip, reduce button height and trim secondary descriptions in the inspector at the same time.
## 2026-03-28 Module Deletion Flows Must Remove The Menu Relation Row, Not Just The Module Config Row
- If a delete dialog is triggered from a second-level menu card, deleting only the downstream bill/single-table config is not enough. The menu relation in `subsystem-menu-config` must be deleted as part of the same confirmation flow, or the UI/backend relationship drifts.
- For this dashboard flow, the delete path needs the real `menuId` from the selected menu card. Validate that id before deleting, call `DELETE /api/system/subsystem-menu-config/{menuId}`, and only then treat the menu as fully removed in local state.

## 2026-03-29 Detail Resource Load Effects Must Not Depend On Live SQL Draft State
- In module-setting editors, a live textarea draft like `detailTableConfigs[activeTab].mainSql` is not an authoritative backend identity. If a resource-loading effect depends on that draft, every keystroke can fan out into needless GET requests and state rewrites.
- For detail menus/colors, the durable trigger is the persisted detail identity plus the detail fill type, not the unsaved SQL text. Tie the load effect to `detailId`, `relatedModule`, and table-like fill types, and keep the SQL draft out of the dependency list unless the request really parses the draft itself.
- If an effect both fetches decorations and writes them back into `detailTableConfigs`, accidental draft dependencies are especially costly because each keystroke creates both network noise and extra state churn.

## 2026-03-29 Reverse-Semantics Visibility Flags Need Explicit Read/Write Adapters
- Do not let a legacy field like `isVisible` flow straight into shared `visible` booleans when the backend semantics are inverted. In this detail-grid contract, `0` means visible and `1` means hidden, so a generic `Boolean(isVisible)` mapper will always be wrong.
- Save bodies must also prefer the current UI field (`visible`) over any stale raw backend field (`isVisible`) that may still be sitting on the row object. Otherwise the checkbox appears editable, but save keeps replaying the original backend value.
- When only one endpoint family uses the reversed meaning, isolate that inversion to the specific read mapper and save builder for that family rather than 鈥渇ixing鈥?every visibility flag globally.

## 2026-03-29 Menu Deletion Should Treat The Menu Relation As The Primary Delete Boundary
- A delete action launched from a second-level menu card should not be blocked just because the module type is unknown. The menu relation row in `subsystem-menu-config` is still a valid primary delete target even when the downstream module-config cleanup path is unavailable.
- In this dashboard flow, the safer order is: require a real `menuId`, optionally delete known module config for recognized types, and always delete the menu relation when the user confirms. Using `moduleTypeProfile` as a hard gate makes 鈥滄湭鎸囧畾鈥?menus undeletable for no good reason.
- If some module families still lack dedicated cleanup APIs, skip only that cleanup branch. Do not turn that into a blanket 鈥渃annot delete menu鈥?decision.

## 2026-03-29 Detail Save Bodies Must Prefer Live Grid Config Over Legacy Raw DTO Fields
- In module-setting detail saves, do not build the request body by preferring legacy raw fields like `detailsql` or `unioncond` ahead of the current `gridConfig.mainSql/sourceCondition`. That makes the editor appear editable while the save path silently replays the original backend values.
- This is especially dangerous when the UI stores the live draft in a different object than the original tab DTO. Diff comparison will also misfire if both the 鈥渃urrent鈥?body and baseline body are normalized from the same stale raw field.
- For detail SQL and related conditions, the durable rule is: use current grid config first, and only fall back to legacy DTO fields when the current grid config truly has no value.

## 2026-03-29 Closing A Wizard Does Not Automatically Refresh Page Data Unless The Load Effect Watches A Dedicated Signal
- If a page list is loaded only from route or selection dependencies, simply closing a modal or config wizard will not refresh the list even when users expect to return to freshly updated cards. In this dashboard flow, the second-level menu page only reloaded on `activeFirstLevelMenu` or `selectedSubsystem` changes.
- The minimal fix is often a small refresh nonce tied to the close action and included in the page-load effect dependencies. That keeps navigation behavior unchanged while still re-fetching the current page when the wizard closes.
- Prefer this scoped refresh signal over broad 鈥渞eset the whole page鈥?logic when the user only needs the currently selected menu page to rehydrate.
## 2026-04-01 Table-Like Previews Must Not Split Header And Body Into Separate DOM Trees
- If a module-setting preview is supposed to feel like a real table, do not render the header in one standalone `<table>` and the body as a separate sibling flex/button block just because the canvas needs whole-table selection. That structure is visually fragile and immediately reads like a fake table once users look at the header/body seam.
- In this repo's `table-builder`, the safer pattern is to keep `thead` and `tbody` inside the same table and place the selectable canvas inside a single `td[colSpan]`. Whole-table click behavior can stay on the button inside that cell without sacrificing table semantics.
- Once a header cell already uses a full-cell selected background, avoid adding a second inner badge-style background to the label. Double-highlighting makes the header look like a floating chip pasted onto the table instead of a normal selected column header.
## 2026-04-01 Local IP Changes Must Also Update The Checked-In Dev Env Override
- If the machine's LAN IP changes, do not only restart the dev server and assume requests will follow the new host automatically. In this repo, local front-end API calls were still pinned by `.env.local`.
- For `npm run dev:client`, the effective API target comes from `VITE_API_BASE_URL` in the Vite env layer, not from whatever IP the page is currently opened with.
- After changing a local env override, restart the Vite dev server and verify the transformed `/src/lib/api-config.ts` output, because that shows the actual injected runtime value.
## 2026-04-01 When Swapping A Custom Preview To Ant Design Table, Limit The Change To The Preview Branch
- If users only complain about the visual credibility of a table preview, do not rewrite the whole builder/editor around a new UI library. In this repo, the safer move was to swap only the `backgroundSelectable` preview branch to `Ant Design Table` and leave the editing branch on the existing DOM and interaction model.
- Ant Design can provide the shell, but the business interactions should stay in local logic. Header click, context menu, drag-reorder, and resize still belonged to the existing table-builder state machine, so the Antd integration only hosted those controls instead of replacing them.
- When introducing `Antd Table` into an existing custom-styled workspace, add a narrow wrapper class to neutralize default cell padding, header separators, and container chrome. Otherwise the component library will visually fight the existing surface system.
## 2026-04-01 Table Headers In Configuration Workbenches Should Express State, Not Decoration
- In configuration-style tables, header design should stay utilitarian. If the user starts questioning whether the header is 鈥渄oing too much,鈥?gradients, pill backgrounds, and soft shadows have already crossed the line.
- For this repo's `table-builder`, selected/delete/tree states are better expressed with light background shifts and text color changes than with layered chips and inset shadows. The header should still read like a table header first, and only secondarily like an editable control surface.
- When a preview already moved onto `Ant Design Table`, keep the custom header styling even more restrained. Over-styling custom header content inside a standard table shell creates visual conflict immediately.
## 2026-04-01 Ant Design Table Does Not Remove The Need For A Real Column DnD Strategy
- Swapping a preview shell to `Ant Design Table` does not magically give the project stable column drag-reorder behavior. Antd's official Table docs still describe column drag sorting as an integration pattern via `components` + `dnd-kit`, not as a built-in one-prop feature.
- If a project already has custom HTML5 drag/drop logic on raw `<th>` elements, simply rehosting that logic inside Antd header titles and `onHeaderCell` hooks is a transitional bridge, not a durable final solution.
- When users start reporting that column dragging 鈥渇eels wrong鈥?after the Antd swap, treat that as a sign to choose one clear strategy: either keep the custom native-table builder for editable drag scenarios, or align with the official `dnd-kit` integration pattern instead of mixing shells and drag models.
## 2026-04-01 React-Resizable Requires Its CSS And A Non-Blocked Start Event To Feel Alive
- In this repo's `table-builder`, simply replacing a custom resize rail with `<Resizable>` was not enough. Without importing `react-resizable/css/styles.css` and aligning the custom handle to the library's expected handle class, the drag hot zone became unreliable.
- Do not eagerly call `preventDefault/stopPropagation` in `onResizeStart` unless there is a proven conflict. On this screen, that extra blocking was more likely to make users feel the handle was dead than to solve any real bubbling problem.
- If the selected-column style paints the entire resize hot zone, users will read it as a broken column seam rather than a resize affordance. Keep the heat zone mostly transparent by default and let only hover/resizing expose the rail.
- For this table-builder preview, a plain `span` handle anchored to the column edge is safer than a full `button`-style interactive surface. The resize handle should behave like an invisible edge grab, not like a second header control fighting the main header button.

## 2026-04-01 If The User Explicitly Wants Pure Antd Tables, Stop Patching The Custom Preview Chrome
- Once the user says to delete the custom content layers and directly use a fresh Ant Design table, continuing to patch the fake canvas/body shell is the wrong optimization target. In this repo, the safer move was to route the actual render path back to a plain `Antd Table` for both main and detail previews.
- When doing that reset, keep only the business-critical wiring: column labels, selection hooks, context menu hooks, and add-column entry. Drag, resize, and decorative overlay layers can be reintroduced later only after the table semantics are stable again.
- If users then report that main and detail column widths still look different, first suspect Antd's width distribution behavior rather than the column data itself. When the total configured width is smaller than the container, Antd will visually stretch the table unless you explicitly let it render at `max-content`.
- For this preview use case, `scroll.x = 'max-content'` plus forcing the internal header/body tables to `width: max-content` keeps widths faithful to the field config and avoids the 鈥渄etail table looks wider than main table鈥?illusion.

## 2026-04-01 Table Preview Column Resize Should Use One Shared React-Resizable Header Shell
- If the user explicitly asks for `react-resizable`, do not keep polishing a bespoke `mousedown + document mousemove` resize rail just because it already exists. In this repo's `table-builder`, the cleaner move was to introduce one reusable resizable header shell and let both main-table and detail-table previews share it.
- Once a preview shell is already on `Ant Design Table`, split responsibilities cleanly: `dnd-kit` handles column order, `react-resizable` handles column width, and the header button keeps selection/context-menu behavior. Mixing a document-level resize listener into that stack keeps main/detail behavior inconsistent for longer.

## 2026-04-01 Antd Table Preview Column Drag Should Use dnd-kit Through Header Components
- If a table preview has already moved onto `Ant Design Table`, do not keep the old HTML5 `draggable/onDrop` chain attached to `title` spans and `onHeaderCell`. That hybrid path is exactly where drag stability starts breaking.
- In this repo, the stable migration path is: keep the normal/native table branch as-is, and move only the Antd preview branch onto `DndContext + SortableContext + components.header.cell`.
- Attach the drag activator to the header label area, not the whole `th`, so column resize rails and header click selection do not fight the drag sensor.
- If users still say the drag feels 鈥渟low鈥?or 鈥渙ff-position鈥?after the first dnd-kit migration, do not stop at swapping APIs. For Antd-style headers, also align the interaction model: restrict movement to the horizontal axis, prefer pointer-based collision over center-only heuristics, and use `DragOverlay` so the dragged header follows the cursor instead of feeling like a lagging transformed table cell.
- If main-table drag starts feeling fine but detail-table drag still feels wrong on the same screen, compare their preview density and minimum visible width before assuming the drag library is still wrong. In this repo, detail previews were compact and still allowed columns to collapse toward `1px`, which simultaneously shrank the drag hit area and made header text disappear.
- If a preview table keeps fighting drag and resize even after tuning sensors and collision rules, inspect whether the table body is still a custom canvas disguised as a row. In this repo, the fastest way back to stable behavior was to remove the big placeholder panel entirely and let `Antd Table` render standard empty rows, so drag, width, and hit testing all operate against real table DOM again.
- If main and detail previews are supposed to behave the same, do not leave one of them on a special compact density. Even if they share the same table-builder code, a different density still changes header height, body row height, and perceived drag hit area enough for users to call the behavior 鈥渄ifferent鈥?

## 2026-04-01 Antd Rc-Table Width Stretch Needs An Explicit Numeric Width, Not Just max-content
- In this repo's Antd preview tables, `scroll.x = 'max-content'` plus CSS `width: max-content` was not sufficient once `rc-table` entered horizontal-scroll mode. The inner header/body tables still received numeric width and `min-width` constraints that visually stretched columns.
- When the user wants WinForms-like fixed-width tiling, the safer solution is to compute the total configured column width in the host, pass it down as one CSS variable, use the same numeric value for `scroll.x`, and force both inner header/body tables to `width` and `min-width` equal to that variable.
- If a UI bug report says "娌℃敼" after a seemingly correct CSS change, treat that as a signal to inspect the component library's generated inline/layout styles rather than assuming the user cached the page.


## 2026-04-02 Table Preview Fill Semantics Must Match The Workspace
- When the user says the preview should feel like WinForms, do not only restyle the table itself. First check whether the preview host actually behaves like a filled layout container.
- A table preview that renders a fixed 4/5 placeholder rows will always read as "shrunk into the top-left corner" even if the table component itself is Ant Design.
- For these module-setting workbenches, the preview body height must follow the available panel height; otherwise users will correctly perceive that there is no outer layout control plus filled inner grid semantics.
- Vertical fill alone is not enough. If the configured columns are narrower than the workspace, users will still perceive the preview as not filled unless the table shell also renders a horizontal remainder area inside the grid.

## 2026-04-02 Resizable Table Width Logic Must Live On The Real Header Cell
- If enabling drag/resize suddenly breaks visible column widths, inspect where resize is attached before tuning widths. Wrapping only the header title content in `react-resizable` is not equivalent to resizing the actual Antd header cell.
- In Ant Design Table, the more stable pattern is to attach resize metadata through `onHeaderCell` and let the custom `components.header.cell` handle the real `th`. Otherwise header content width and table column width can drift apart even though the numeric width looks correct in code.
- If a `react-resizable` drag only moves 1-2px and then stops, suspect that resize is committing parent column state on every mousemove and causing the header cell to remount mid-drag. Keep live resize width local to the header cell, then commit to the real column config on resize stop.
- If users say the resize now works but still has no real-time animation, check whether only the local header shell width is changing. In this workbench, full-table live feedback comes from the shared `activeResize` preview state, so the `react-resizable` branch must drive `scheduleResizePreview/clearResizePreview` during drag instead of waiting until resize stop.
- But do not route that live preview through a too-high owner like `Dashboard` if the preview is rendered by an Antd table with `react-resizable` header cells. In this repo, pushing every mousemove into the global resize state caused the whole table-builder runtime to re-evaluate and the current resize gesture started breaking again. For this preview branch, a local table-builder live-resize state is safer than a global preview state.
- If the resize no longer breaks but still feels like it lags behind the cursor, inspect the active header cell's local width state update policy. In this repo's React 19 setup, letting `setLiveResizeWidth` stay in the normal batched path can make the handle feel delayed; for this very hot resize path, a narrowly scoped synchronous update is safer than assuming default batching will feel interactive enough.
## 2026-04-02 Detail Workbench Polish Should Remove Redundant Prompt Rows Before Adding More Decoration
- When the center workbench already has tabs, action buttons, and a full preview table, an extra "表格视图" label strip usually adds noise more than clarity. Removing that prompt row is a better first move than trying to style it harder.
- If users say tab headers feel too tall, check both the component token height and the outer container padding. In this repo, the perceived height comes from Antd Tabs plus the wrapper's top padding, so both layers need to be tightened together.
- For small creation actions like "新增明细" in a workbench header, a lighter pill-style primary action reads better than a plain utility button, but it still needs to stay compact so it does not make the tab bar taller again.
## 2026-04-02 Antd Preview Scrollbars Should Have A Single Owner
- If a preview shell wraps `Antd Table` in another `overflow-x-auto` container, do not assume both scroll layers will cooperate. In this repo, the outer workbench wrapper and the inner `ant-table-content` were competing to own horizontal scrolling, which made the visible bottom scrollbar disappear in the detail area.
- For the Antd preview branch, let `Antd Table` own the horizontal scrollbar and keep the outer wrapper on `overflow-hidden` unless the non-Antd branch still truly needs container-level scrolling.
- If you add a dedicated bottom scrollbar under a filled Antd preview, the host must be a real column flex layout. Otherwise the table can consume the available height first and the scrollbar may technically render but still be clipped below the visible workbench.
- If the user explicitly asks to rely on Antd's built-in scrollbar, stop layering a second synced scrollbar under the table. On this screen, the extra bar solved one symptom but made the ownership model harder to reason about than simply restoring the library's native horizontal scroll.
