// ======================================================
// 🎣 gem4.js（最終完成版 / 魚の管理、アニメーション含む）2025/11/05
// ======================================================

// ==== 基本設定 =======================================================
// キャンバスの基本サイズ
const W = 1920, H = 1080;

// 画像パス設定：読み込む画像を一元管理
const IMG = {
  sea:   "images/sea.png",
  sky:   "images/sky.png",
  hook:  "images/hari3.png",
  taroa: "images/taroa.png", // 既存のtaroa.pngが1boy.png相当
  calcBG:"images/calc_bg.png",
  f5: { normal: "images/f5_normal.png", hover: "images/f5_hover.png", down: "images/f5_ckick.png" },
  f8: { normal: "images/f8_normal.png", hover: "images/f8_hover.png", down: "images/f8_ckick.png" },

  // 💥修正：釣り師アニメーションのパスを 'images/boy/' に変更
  // taroaは既存のtaroa.png（1boy.png相当と仮定）を使用するため、taroa2以降のみ修正
  taroa2: "images/boy/2boy.png", 
  taroa3: "images/boy/3boy.png", 
  taroa4: "images/boy/4boy.png", 

  // 💥修正：魚の画像のパスを 'images/fish/' に変更
  fish1: "images/fish/1kinme-tai.png",
  fish2: "images/fish/2kurodai.png",
  fish3: "images/fish/3iscimochi.png",
  fish4: "images/fish/4suzuki3.png",
  fish5: "images/fish/5akou.png",
  fish6: "images/fish/6kasago.png"
};

// レイアウト・物理パラメータ：画面要素の初期位置や動きに関する設定
const LAYOUT = {
  sea: { x: 0, y: 0 },
  sky: { x: 0, y: 0 },

  // 電卓の初期位置とスケール
  calc: { x: 665, y: 278, scale: 0.2467 },

  // 上下ボタン（電卓に追従）
  btnUp:   { x: 747, y: 295, scale: 0.2478 },
  btnDown: { x: 747, y: 353, scale: 0.2489 },

  // 釣り針
  hook: { x: 1074, y: 504, scale: 0.6 },
  hookBounds: { top: 700.8, bottom: 975 },
  hookSpeed: 100, // 1秒あたりの移動ピクセル数
  HOOK_MOVE_STEP: 10, // ワンクリックでの移動量

  // 釣り人
  taroa: { x: 1104, y: 207, scale: 0.6276 }
};

// ==== カスタマイズスイッチ ===========================================

// 🧩 ドラッグ中の不透明度
const DRAGGING_ALPHA = 0.6;

// 🎣 魚とアニメーションの設定 (CUSTOMIZATION: 魚のサイズもここで調整)
const FISH_SETTINGS = [
  { speed: 100, scale: 0.12 }, // 魚1 >0.25//1kinme-tai(サイズ調整済みと仮定)
  { speed: 80, scale: 0.12 },  // 魚2>0.3 //2kurodai
  { speed: 120, scale: 0.2 }, // 魚3>0.2 //3iscimochi
  { speed: 90, scale: 0.15 }, // 魚4>0.35//4suzuki3　
  { speed: 70, scale: 0.11 }, // 魚5>0.27//5akou
  { speed: 110, scale: 0.15 } // 魚6>0.33//6kasago
];
const FISH_SPAWN_INTERVAL = 3; // 魚を生成する間隔（秒）
const VERTICAL_SPEED = 200; // 釣られた魚の上昇速度

// 🎣 釣り師アニメーション設定 (CUSTOMIZATION: 時間短縮)
const ANIM_FRAME_DURATION = 0.3; // 💥修正: 各フレームの表示時間（秒）を短縮
const ANIM_FORWARD_DURATION = ANIM_FRAME_DURATION * 4;
const SCORE_PROCESSING_DURATION = 1.5; // 💥修正: 釣った後の静止時間（秒）を短縮
const ANIM_REVERSE_DURATION = ANIM_FRAME_DURATION * 3;
const TOTAL_ANIMATION_DURATION = ANIM_FORWARD_DURATION + SCORE_PROCESSING_DURATION + ANIM_REVERSE_DURATION;
// ==== ユーティリティ =================================================
function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); 
    im.onerror = rej;          
    im.src = src;
  });
}

// ==== 魚のクラス（Fish Object）=======================================
class Fish {
  constructor(image, x, y, speed, scale) { 
    this.image = image;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.scale = scale;
    this.w = Math.round(image.width * scale); 
    this.h = Math.round(image.height * scale);
    this.isCaught = false; 
    this.catchTimer = 0; // 釣られてからの経過時間（秒）
  }

  // Fishクラスの定義内
update(dt) {
  if (!this.isCaught) {
    this.x += this.speed * dt;
  } else {
    // 釣られた後の動作
    this.catchTimer += dt; 
    this.y -= VERTICAL_SPEED * dt; // 垂直に上に移動
    // 💥修正：魚のX座標を、釣り針のX座標（LAYOUT.hook.x）に一致させる
    this.x = LAYOUT.hook.x; // 👈 この行を LAYOUT.hook.x に設定
  }
}

  draw(ctx) {
    // isCaughtの場合は描画処理がtick関数側の特殊な描画ロジックで行われる
    ctx.drawImage(this.image, this.x, this.y, this.w, this.h);
  }

  // 釣られた時の回転角度を取得
  getRotationAngle() {
    const ROTATION_DURATION = 0.5; // 0.5秒で90度回転を完了させる（微調整変数）
    let progress = Math.min(1.0, this.catchTimer / ROTATION_DURATION); 
    return progress * (-Math.PI / 2); 
  }

  // 釣り針の先端座標(hookX, hookY)とのPoint-to-Box判定（右端10%に限定）
  checkHit(hookX, hookY) {
    const hitWidthRatio = 0.1; 
    const hitWidth = this.w * hitWidthRatio;
    const hitAreaStartX = this.x + this.w - hitWidth; 

    return (
      hookX >= hitAreaStartX && 
      hookX <= this.x + this.w && 
      hookY >= this.y && 
      hookY <= this.y + this.h
    );
  }
}
// ====================================================================


// ==== ボタンクラス（画像3状態＋クリック判定） =========================
class Button {
  // ... (既存のButtonクラスのコードはそのまま維持)
  constructor(images, x, y, scale = 1) {
    this.images = images; // {normal, hover, down} の3状態の画像
    this.x = x; this.y = y; this.scale = scale;
    this.state = "normal"; // "normal", "hover", "down"
    this.w = Math.round(images.normal.width * scale);
    this.h = Math.round(images.normal.height * scale);
    this.isPointerDown = false; // マウスボタンが押されているか
  }

  // (px, py) がボタンの矩形内にあるか判定
  contains(px, py) {
    return (px >= this.x && px <= this.x + this.w &&
            py >= this.y && py <= this.y + this.h);
  }

  // マウスカーソルが動いた時の処理
  handlePointerMove(px, py) {
    if (this.isPointerDown) this.state = this.contains(px, py) ? "down" : "normal";
    else                    this.state = this.contains(px, py) ? "hover" : "normal";
  }

  // マウスボタンが押された時の処理
  handlePointerDown(px, py) {
    if (!this.contains(px, py)) return false;
    this.isPointerDown = true;
    this.state = "down";
    return true;
  }

  // マウスボタンが離された時の処理
  handlePointerUp(px, py) {
    const clicked = this.isPointerDown && this.contains(px, py);
    this.isPointerDown = false;
    this.state = this.contains(px, py) ? "hover" : "normal";
    return clicked;
  }

  // 現在の state に応じた画像を描画
  draw(ctx) {
    const img = this.state === "down"  ? this.images.down
               : this.state === "hover" ? this.images.hover
               : this.images.normal;
    ctx.drawImage(img, this.x, this.y, this.w, this.h);
  }
}

// ==== メイン処理 =========================================================
(async function main () {
  // --- 初期化 ---
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  // --- 画像の一括読み込み ---
  const [
    imgSea, imgSky, imgHook, imgTaroa, imgCalc,
    f5n, f5h, f5d,
    f8n, f8h, f8d,
    // 💥追加：釣り師アニメーションと魚の画像
    imgTaroa2, imgTaroa3, imgTaroa4,
    imgFish1, imgFish2, imgFish3, imgFish4, imgFish5, imgFish6
  ] = await Promise.all([
    loadImage(IMG.sea),
    loadImage(IMG.sky),
    loadImage(IMG.hook),
    loadImage(IMG.taroa),
    loadImage(IMG.calcBG),
    loadImage(IMG.f5.normal), loadImage(IMG.f5.hover), loadImage(IMG.f5.down),
    loadImage(IMG.f8.normal), loadImage(IMG.f8.hover), loadImage(IMG.f8.down),
    // 💥追加：アニメーション画像と魚の画像6枚のロード
    loadImage(IMG.taroa2), loadImage(IMG.taroa3), loadImage(IMG.taroa4),
    loadImage(IMG.fish1), loadImage(IMG.fish2), loadImage(IMG.fish3), 
    loadImage(IMG.fish4), loadImage(IMG.fish5), loadImage(IMG.fish6)
  ]);
  
  // 💥追加：画像オブジェクトを配列に格納
  const imgFishes = [imgFish1, imgFish2, imgFish3, imgFish4, imgFish5, imgFish6];
  const imgTaroas = [imgTaroa, imgTaroa2, imgTaroa3, imgTaroa4];

  // --- 各要素のサイズ計算 ---
  const calcW  = Math.round(imgCalc.width  * LAYOUT.calc.scale);
  const calcH  = Math.round(imgCalc.height * LAYOUT.calc.scale);
  const taroaW = Math.round(imgTaroa.width * LAYOUT.taroa.scale);
  const taroaH = Math.round(imgTaroa.height * LAYOUT.taroa.scale);
  const hookW  = Math.round(imgHook.width  * LAYOUT.hook.scale);
  const hookH  = Math.round(imgHook.height * LAYOUT.hook.scale);

  // --- 釣り針の基準点補正 ---
  LAYOUT.hook.y += hookH;

  // --- 電卓の可動範囲（sky画像内） ---
  const skyBounds = {
    x: LAYOUT.sky.x,
    y: LAYOUT.sky.y,
    w: imgSky.width,
    h: imgSky.height
  };

  // --- ボタンインスタンスの作成 ---
  const btnUp = new Button(
    { normal: f8n, hover: f8h, down: f8d },
    LAYOUT.btnUp.x, LAYOUT.btnUp.y, LAYOUT.btnUp.scale
  );
  const btnDown = new Button(
    { normal: f5n, hover: f5h, down: f5d },
    LAYOUT.btnDown.x, LAYOUT.btnDown.y, LAYOUT.btnDown.scale
  );

  // --- 電卓とボタンの相対位置を保持 ---
  const btnUpOffset   = { x: btnUp.x   - LAYOUT.calc.x, y: btnUp.y   - LAYOUT.calc.y };
  const btnDownOffset = { x: btnDown.x - LAYOUT.calc.x, y: btnDown.y - LAYOUT.calc.y };

  // --- 状態変数の初期化 ---
  let hookX = LAYOUT.hook.x; // 釣り針のX座標
  let hookY = LAYOUT.hook.y; // 釣り針のY座標（下端基準）

  let draggingCalc = false;             // 電卓をドラッグ中か
  let dragOffset = { x: 0, y: 0 };      // ドラッグ開始点と電卓左上の差分
  let calcAlpha = 1.0;                  // 電卓の不透明度
  
  let fishes = [];               // 💥追加：生成されたFishオブジェクトを格納
  let fishSpawnTimer = 0;        // 💥追加：魚の生成間隔を管理するタイマー（秒）
  let isGamePaused = false;      // 💥追加：ゲーム全体をポーズさせるフラグ
  let caughtFish = null;         // 💥追加：現在釣られている魚オブジェクト

  let taroaAnimationFrame = 0;   // 💥追加：現在の釣り師のアニメーションフレーム(0〜3)
  let taroaAnimationTimer = 0;   // 💥追加：アニメーションのタイマー（秒）


  // === ポインタ座標取得ユーティリティ ===
  const getPointer = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    return { x, y };
  };

  // === 電卓移動処理 ===
  function moveCalcTo(newX, newY) {
    const minX = skyBounds.x;
    const minY = skyBounds.y;
    const maxX = skyBounds.x + skyBounds.w - calcW;
    const maxY = skyBounds.y + skyBounds.h - calcH;

    const clampedX = Math.max(minX, Math.min(maxX, newX));
    const clampedY = Math.max(minY, Math.min(maxY, newY));

    LAYOUT.calc.x = clampedX;
    LAYOUT.calc.y = clampedY;

    btnUp.x   = LAYOUT.calc.x + btnUpOffset.x;
    btnUp.y   = LAYOUT.calc.y + btnUpOffset.y;
    btnDown.x = LAYOUT.calc.x + btnDownOffset.x;
    btnDown.y = LAYOUT.calc.y + btnDownOffset.y;
  }

  // === ポインタイベントリスナー ===
  const onMove = (e) => {
    const {x, y} = getPointer(e);
    if (draggingCalc) {
      moveCalcTo(x - dragOffset.x, y - dragOffset.y);
    } else {
      btnUp.handlePointerMove(x, y);
      btnDown.handlePointerMove(x, y);
    }
  };

  const onDown = (e) => {
    const {x, y} = getPointer(e);

    const hitUp   = btnUp.contains(x, y);
    const hitDown = btnDown.contains(x, y);

    const calcRect = { x: LAYOUT.calc.x, y: LAYOUT.calc.y, w: calcW, h: calcH };
    const inCalc = (x >= calcRect.x && x <= calcRect.x + calcRect.w &&
                    y >= calcRect.y && y <= calcRect.y + calcRect.h);

    const canStartDrag = inCalc && !hitUp && !hitDown;

    if (canStartDrag) {
      draggingCalc = true;
      dragOffset.x = x - LAYOUT.calc.x;
      dragOffset.y = y - LAYOUT.calc.y;
      calcAlpha = DRAGGING_ALPHA; 

      btnUp.isPointerDown = false;  btnUp.state = "normal";
      btnDown.isPointerDown = false;btnDown.state = "normal";

    } else {
      btnUp.handlePointerDown(x, y);
      btnDown.handlePointerDown(x, y);
    }

    e.preventDefault();
  };

  const onUp = (e) => {
    const {x, y} = getPointer(e);

    if (draggingCalc) {
      draggingCalc = false;
      calcAlpha = 1.0; 
    } else {
      if (btnUp.handlePointerUp(x, y)) {
        hookY -= LAYOUT.HOOK_MOVE_STEP;
      }
      if (btnDown.handlePointerUp(x, y)) {
        hookY += LAYOUT.HOOK_MOVE_STEP;
      }
    }

    e.preventDefault();
  };

  // 各イベントを登録
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);

  // === キー入力（↑↓で釣り針操作） ===
  window.addEventListener("keydown", (e) => {
    if (draggingCalc) return;
    if (e.key === "ArrowUp") {
      hookY -= LAYOUT.HOOK_MOVE_STEP;
      btnUp.state = "down";
    }
    if (e.key === "ArrowDown") {
      hookY += LAYOUT.HOOK_MOVE_STEP;
      btnDown.state = "down";
    }
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowUp")   { btnUp.state = "normal"; }
    if (e.key === "ArrowDown") { btnDown.state = "normal"; }
  });

  // === 描画ループ (メインループ) ===
  let last = performance.now();
  function tick(now) {
    const dt = (now - last) / 1000; last = now;

    // --- 状態更新 ---
    // Y座標を hookBounds の範囲内に制限
    hookY = Math.max(LAYOUT.hookBounds.top, Math.min(LAYOUT.hookBounds.bottom, hookY));

    // 1. 魚の生成
    if (!isGamePaused) { // ポーズ中は生成しない
        fishSpawnTimer -= dt;
        if (fishSpawnTimer <= 0) {
            const randIndex = Math.floor(Math.random() * imgFishes.length);
            const fishImg = imgFishes[randIndex];
            const settings = FISH_SETTINGS[randIndex];

            const randY = LAYOUT.hookBounds.top + (Math.random() * (LAYOUT.hookBounds.bottom - LAYOUT.hookBounds.top));
            const startX = -fishImg.width * settings.scale; 

            const newFish = new Fish(fishImg, startX, randY, settings.speed, settings.scale);
            fishes.push(newFish);

            fishSpawnTimer = FISH_SPAWN_INTERVAL + (Math.random() * 2);
        }
    }

    // 2. 魚の移動と画面外の魚の削除
    fishes = fishes.filter(fish => {
      fish.update(dt);
      // 画面右端を超えた魚、または釣られた魚は配列から削除しない
      return fish.x < W || fish.isCaught;
    });


    // 3. 当たり判定と状態遷移（最重要：ポーズ中は当たり判定を行わない）
    if (!isGamePaused) { 
      for (let i = 0; i < fishes.length; i++) {
        const fish = fishes[i];
        if (fish.checkHit(hookX, hookY)) {
          // ヒットした場合
          fish.isCaught = true;
          isGamePaused = true;      // 💥ゲームをポーズ
          caughtFish = fish;        
          break;
        }
      }
    }

    // 4. 釣り師アニメーションとゲーム再開ロジック (isGamePausedがtrueの時のみ実行)
    if (isGamePaused) {
      taroaAnimationTimer += dt;
      const totalTime = taroaAnimationTimer;

      // 1. アニメーション前半 (1boy -> 4boy)
      if (totalTime < ANIM_FORWARD_DURATION) {
        taroaAnimationFrame = Math.floor(totalTime / ANIM_FRAME_DURATION);
        
      } 
      // 2. ホールド/点数処理フェーズ (4boyで静止) 💥将来的な改変ポイント
      else if (totalTime < ANIM_FORWARD_DURATION + SCORE_PROCESSING_DURATION) {
        taroaAnimationFrame = 3; 
        
      } 
      // 3. 逆転アニメーション後半 (4boy -> 1boy) 💥将来的な削除候補
      else if (totalTime < TOTAL_ANIMATION_DURATION) {
        const reverseTime = totalTime - (ANIM_FORWARD_DURATION + SCORE_PROCESSING_DURATION);
        taroaAnimationFrame = 3 - Math.floor(reverseTime / ANIM_FRAME_DURATION);
        
      } 
      // 4. アニメーション終了、ゲーム再開
      else {
        taroaAnimationFrame = 0;
        isGamePaused = false;
        caughtFish = null;
        taroaAnimationTimer = 0;
        
        // 釣れた魚を魚の配列から削除（釣り上げ完了）
        fishes = fishes.filter(fish => !fish.isCaught);
      }
    }


    // --- 描画処理 ---
    ctx.clearRect(0, 0, W, H); 

    // ② sea（背景）
    ctx.drawImage(imgSea, LAYOUT.sea.x, LAYOUT.sea.y);

    // 💥魚の描画
    fishes.forEach(fish => {
      if (fish.isCaught) {
        // 釣られた魚：catchTimerに基づき、0度から-90度へ回転し、上昇
        ctx.save();

        // 💥修正版: 回転の中心を、魚の左端のY中心（フックの位置）に設定
        ctx.translate(
            fish.x, // X座標: LAYOUT.hook.x (釣り針の垂直線)
            fish.y + fish.h / 2 // Y座標を魚のY中心に移動
        );

        ctx.rotate(fish.getRotationAngle());

        // 描画開始点を (0, 0) に設定し、魚の画像を回転原点（釣り針のX座標）から右側に描画する
        ctx.drawImage(fish.image, 0, -fish.h / 2, fish.w, fish.h); 
        ctx.restore();

      } else {
        // ... (省略)
        fish.draw(ctx);
      }
    });

    // ③ 釣り針
    // 💥修正：isGamePausedがfalse（ゲーム中）の時のみ描画する
    if (!isGamePaused) { 
        // 💥注意: hookYは下端基準のため、描画時に縮小後の画像の高さ(hookH)を引いて左上座標を計算します。
        ctx.drawImage(imgHook, LAYOUT.hook.x, Math.round(hookY) - hookH, hookW, hookH);
    }

    // ④ sky（水面）
    ctx.drawImage(imgSky, LAYOUT.sky.x, LAYOUT.sky.y);

    // ⑤ 人物（アニメーションフレームに応じて画像を選択）
    const currentTaroaImg = imgTaroas[taroaAnimationFrame];
    ctx.drawImage(currentTaroaImg, LAYOUT.taroa.x, LAYOUT.taroa.y, taroaW, taroaH);

    // ⑥ 電卓・ボタン（半透明制御）
    ctx.save();
    ctx.globalAlpha = calcAlpha;
    ctx.drawImage(imgCalc, LAYOUT.calc.x, LAYOUT.calc.y, calcW, calcH);
    btnUp.draw(ctx);
    btnDown.draw(ctx);
    ctx.restore();

    requestAnimationFrame(tick);
  }

  // --- 初期化実行 ---
  moveCalcTo(LAYOUT.calc.x, LAYOUT.calc.y);
  requestAnimationFrame(tick);
})();

/* ========================== 学習メモ ==========================
// ... (既存の学習メモは省略)
============================================================= */