import { Injectable } from '@angular/core';
import {
  Application,
  Utils,
  isIOS,
  knownFolders,
  path,
} from '@nativescript/core';
import {
  SHARE_CARD_GRADIENTS,
  ShareCardData,
  ShareCardFormat,
  ShareCardTheme,
  DailyCardData,
  MilestoneCardData,
  WeeklyCardData,
  MonthlyCardData,
} from '../models/share-card.model';

const STORY_W = 1080;
const STORY_H = 1920;
const FEED_W = 1080;
const FEED_H = 1080;
const SHARE_FILENAME = 'prayer-streak-share.png';
const WATERMARK = 'prayerstreaks.com';

@Injectable({ providedIn: 'root' })
export class ShareService {
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  shareCard(
    data: ShareCardData,
    theme: ShareCardTheme,
    format: ShareCardFormat
  ): void {
    try {
      const imagePath = this.generateCardImage(data, theme, format);
      this.openShareSheet(imagePath);
    } catch (err) {
      console.error('ShareService: failed to share card', err);
    }
  }

  shareToInstagramStories(
    data: ShareCardData,
    theme: ShareCardTheme
  ): void {
    try {
      const imagePath = this.generateCardImage(data, theme, 'story');
      const sent = isIOS
        ? this.openIOSInstagramStories(imagePath)
        : this.openAndroidInstagramStories(imagePath);
      if (!sent) this.openShareSheet(imagePath);
    } catch (err) {
      console.error('ShareService: Instagram Stories fallback', err);
      try {
        const imagePath = path.join(knownFolders.temp().path, SHARE_FILENAME);
        this.openShareSheet(imagePath);
      } catch { /* noop */ }
    }
  }

  /** Backward-compatible entry point. */
  shareStreak(currentStreak: number, _longestStreak: number): void {
    this.shareCard({ type: 'daily', currentStreak }, 'ocean', 'feed');
  }

  // ---------------------------------------------------------------------------
  // Image Generation
  // ---------------------------------------------------------------------------

  private generateCardImage(
    data: ShareCardData,
    theme: ShareCardTheme,
    format: ShareCardFormat
  ): string {
    const w = format === 'story' ? STORY_W : FEED_W;
    const h = format === 'story' ? STORY_H : FEED_H;
    const tempPath = path.join(knownFolders.temp().path, SHARE_FILENAME);

    if (isIOS) {
      this.renderIOSCard(data, theme, w, h, tempPath);
    } else {
      this.renderAndroidCard(data, theme, w, h, tempPath);
    }

    return tempPath;
  }

  // ---------------------------------------------------------------------------
  // iOS — Core Graphics
  // ---------------------------------------------------------------------------

  private renderIOSCard(
    data: ShareCardData,
    theme: ShareCardTheme,
    w: number,
    h: number,
    outputPath: string
  ): void {
    UIGraphicsBeginImageContextWithOptions(CGSizeMake(w, h), true, 1);
    const ctx = UIGraphicsGetCurrentContext();

    this.drawIOSGradient(ctx, theme, w, h);

    switch (data.type) {
      case 'daily':
        this.renderIOSDailyContent(ctx, data, w, h);
        break;
      case 'milestone':
        this.renderIOSMilestoneContent(ctx, data, w, h);
        break;
      case 'weekly':
        this.renderIOSWeeklyContent(ctx, data, w, h);
        break;
      case 'monthly':
        this.renderIOSMonthlyContent(ctx, data, w, h);
        break;
    }

    this.drawIOSWatermark(ctx, w, h);

    const image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    const pngData = UIImagePNGRepresentation(image);
    pngData.writeToFileAtomically(outputPath, true);
  }

  private drawIOSGradient(
    ctx: any,
    theme: ShareCardTheme,
    w: number,
    h: number
  ): void {
    const g = SHARE_CARD_GRADIENTS.find((x) => x.id === theme) ??
      SHARE_CARD_GRADIENTS[0];
    const colorSpace = CGColorSpaceCreateDeviceRGB();
    const c1 = this.iosColorFromHex(g.color1);
    const c2 = this.iosColorFromHex(g.color2);
    const colors = NSArray.arrayWithArray([c1.CGColor, c2.CGColor]);
    const gradient = CGGradientCreateWithColors(colorSpace, colors, null);
    CGContextDrawLinearGradient(
      ctx,
      gradient,
      CGPointMake(0, 0),
      CGPointMake(w, h),
      CGGradientDrawingOptions.kCGGradientDrawsBeforeStartLocation
    );
  }

  private renderIOSDailyContent(
    ctx: any,
    data: DailyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const white = UIColor.whiteColor;
    const faded = this.iosWhite(0.9);
    const subtle = this.iosWhite(0.7);
    const center = this.iosCenterStyle();

    this.iosText('🔥', s ? 560 : 220, w,
      UIFont.systemFontOfSize(s ? 120 : 80), white, center);

    this.iosText(`Day ${data.currentStreak}`, s ? 710 : 340, w,
      UIFont.systemFontOfSizeWeight(s ? 160 : 120, UIFontWeightBold),
      white, center);

    this.iosText('I prayed today', s ? 920 : 540, w,
      UIFont.systemFontOfSizeWeight(s ? 50 : 40, UIFontWeightMedium),
      faded, center);

    if (data.prayerType) {
      const label =
        data.prayerType.charAt(0).toUpperCase() + data.prayerType.slice(1);
      this.iosText(`· ${label} ·`, s ? 1010 : 620, w,
        UIFont.systemFontOfSizeWeight(s ? 38 : 32, UIFontWeightMedium),
        subtle, center);
    }
  }

  private renderIOSMilestoneContent(
    ctx: any,
    data: MilestoneCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const white = UIColor.whiteColor;
    const faded = this.iosWhite(0.9);
    const subtle = this.iosWhite(0.7);
    const center = this.iosCenterStyle();

    this.iosText('⭐', s ? 470 : 130, w,
      UIFont.systemFontOfSize(s ? 120 : 80), white, center);

    this.iosText('Milestone Unlocked!', s ? 630 : 260, w,
      UIFont.systemFontOfSizeWeight(s ? 40 : 32, UIFontWeightSemibold),
      faded, center);

    this.iosText(data.title, s ? 730 : 340, w,
      UIFont.systemFontOfSizeWeight(s ? 64 : 48, UIFontWeightBold),
      white, center);

    this.iosText(`${data.days}-day streak`, s ? 840 : 430, w,
      UIFont.systemFontOfSizeWeight(s ? 42 : 34, UIFontWeightMedium),
      faded, center);

    CGContextSetFillColorWithColor(ctx, this.iosWhite(0.3).CGColor);
    CGContextFillRect(ctx, CGRectMake((w - 160) / 2, s ? 930 : 510, 160, 2));

    if (data.quote) {
      this.iosText(`"${data.quote}"`, s ? 980 : 550, w,
        UIFont.italicSystemFontOfSize(s ? 34 : 28), subtle, center);
    }
  }

  private renderIOSWeeklyContent(
    ctx: any,
    data: WeeklyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const white = UIColor.whiteColor;
    const faded = this.iosWhite(0.9);
    const center = this.iosCenterStyle();
    const purple = this.iosColorFromHex('#a78bfa');
    const cellW = w / 7;
    const circleR = s ? 35 : 28;

    this.iosText('Weekly Recap', s ? 560 : 200, w,
      UIFont.systemFontOfSizeWeight(s ? 64 : 48, UIFontWeightBold),
      white, center);

    this.iosText(`${data.totalPrayers} of 7 days`, s ? 660 : 280, w,
      UIFont.systemFontOfSizeWeight(s ? 42 : 34, UIFontWeightMedium),
      faded, center);

    const labelY = s ? 830 : 430;
    const circleY = s ? 950 : 540;

    for (let i = 0; i < 7 && i < data.days.length; i++) {
      const cx = cellW * i + cellW / 2;
      const day = data.days[i];

      this.iosTextAt(day.dayLabel, cx, labelY,
        UIFont.systemFontOfSizeWeight(s ? 28 : 22, UIFontWeightMedium), faded);

      if (day.checked) {
        this.iosFilledCircle(ctx, cx, circleY, circleR, white);
      } else if (day.shielded) {
        this.iosFilledCircle(ctx, cx, circleY, circleR, purple);
      } else {
        this.iosStrokeCircle(ctx, cx, circleY, circleR, this.iosWhite(0.3), 2);
      }
    }
  }

  private renderIOSMonthlyContent(
    ctx: any,
    data: MonthlyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const white = UIColor.whiteColor;
    const faded = this.iosWhite(0.9);
    const subtle = this.iosWhite(0.5);
    const purple = this.iosColorFromHex('#a78bfa');
    const center = this.iosCenterStyle();

    this.iosText(`${data.monthLabel} ${data.year}`, s ? 380 : 100, w,
      UIFont.systemFontOfSizeWeight(s ? 64 : 48, UIFontWeightBold),
      white, center);

    this.iosText(
      `${data.totalPrayed} ${data.totalPrayed === 1 ? 'day' : 'days'} prayed`,
      s ? 480 : 180, w,
      UIFont.systemFontOfSizeWeight(s ? 42 : 34, UIFontWeightMedium),
      faded, center);

    const cellW = s ? 120 : 100;
    const cellH = s ? 100 : 80;
    const gridW = 7 * cellW;
    const gridX = (w - gridW) / 2;
    const headerY = s ? 620 : 290;
    const gridStartY = s ? 700 : 360;
    const circleR = s ? 22 : 18;
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const checkedSet = new Set(data.checkedDays);
    const shieldedSet = new Set(data.shieldedDays);

    for (let col = 0; col < 7; col++) {
      const cx = gridX + col * cellW + cellW / 2;
      this.iosTextAt(dayHeaders[col], cx, headerY,
        UIFont.systemFontOfSizeWeight(s ? 28 : 22, UIFontWeightSemibold),
        faded);
    }

    for (let day = 1; day <= data.daysInMonth; day++) {
      const idx = data.firstDayOfWeek + day - 1;
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = gridX + col * cellW + cellW / 2;
      const cy = gridStartY + row * cellH + cellH / 2;

      if (checkedSet.has(day)) {
        this.iosFilledCircle(ctx, cx, cy, circleR, white);
        this.iosTextAt(`${day}`, cx, cy,
          UIFont.systemFontOfSizeWeight(s ? 24 : 20, UIFontWeightBold),
          this.iosColorFromHex('#1e3a5f'));
      } else if (shieldedSet.has(day)) {
        this.iosFilledCircle(ctx, cx, cy, circleR, purple);
        this.iosTextAt(`${day}`, cx, cy,
          UIFont.systemFontOfSizeWeight(s ? 24 : 20, UIFontWeightBold), white);
      } else {
        this.iosTextAt(`${day}`, cx, cy,
          UIFont.systemFontOfSize(s ? 24 : 20), subtle);
      }
    }

    const statsY = gridStartY + 6 * cellH + (s ? 40 : 20);
    this.iosText(
      `Current streak: ${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`,
      statsY, w,
      UIFont.systemFontOfSizeWeight(s ? 36 : 30, UIFontWeightMedium),
      faded, center);
  }

  private drawIOSWatermark(ctx: any, w: number, h: number): void {
    const center = this.iosCenterStyle();
    this.iosText(WATERMARK, h - (h > w ? 70 : 55), w,
      UIFont.systemFontOfSizeWeight(h > w ? 30 : 26, UIFontWeightMedium),
      this.iosWhite(0.5), center);
  }

  // --- iOS helpers ---

  private iosText(
    text: string,
    y: number,
    width: number,
    font: UIFont,
    color: UIColor,
    style: NSParagraphStyle
  ): void {
    const str = NSString.stringWithString(text);
    const attrs = NSDictionary.dictionaryWithObjectsForKeys(
      [font, color, style],
      [NSFontAttributeName, NSForegroundColorAttributeName, NSParagraphStyleAttributeName]
    );
    const size = str.sizeWithAttributes(attrs);
    str.drawInRectWithAttributes(
      CGRectMake(0, y, width, size.height),
      attrs
    );
  }

  private iosTextAt(
    text: string,
    x: number,
    y: number,
    font: UIFont,
    color: UIColor
  ): void {
    const str = NSString.stringWithString(text);
    const center = this.iosCenterStyle();
    const attrs = NSDictionary.dictionaryWithObjectsForKeys(
      [font, color, center],
      [NSFontAttributeName, NSForegroundColorAttributeName, NSParagraphStyleAttributeName]
    );
    const size = str.sizeWithAttributes(attrs);
    str.drawInRectWithAttributes(
      CGRectMake(x - size.width / 2, y - size.height / 2, size.width, size.height),
      attrs
    );
  }

  private iosFilledCircle(
    ctx: any,
    cx: number,
    cy: number,
    r: number,
    color: UIColor
  ): void {
    CGContextSetFillColorWithColor(ctx, color.CGColor);
    CGContextFillEllipseInRect(
      ctx,
      CGRectMake(cx - r, cy - r, r * 2, r * 2)
    );
  }

  private iosStrokeCircle(
    ctx: any,
    cx: number,
    cy: number,
    r: number,
    color: UIColor,
    lineWidth: number
  ): void {
    CGContextSetStrokeColorWithColor(ctx, color.CGColor);
    CGContextSetLineWidth(ctx, lineWidth);
    CGContextStrokeEllipseInRect(
      ctx,
      CGRectMake(cx - r, cy - r, r * 2, r * 2)
    );
  }

  private iosCenterStyle(): NSMutableParagraphStyle {
    const style = NSMutableParagraphStyle.alloc().init();
    style.alignment = NSTextAlignment.Center;
    return style;
  }

  private iosColorFromHex(hex: string, alpha = 1.0): UIColor {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return UIColor.alloc().initWithRedGreenBlueAlpha(r, g, b, alpha);
  }

  private iosWhite(alpha: number): UIColor {
    return UIColor.alloc().initWithWhiteAlpha(1.0, alpha);
  }

  // ---------------------------------------------------------------------------
  // Android — Canvas / Bitmap
  // ---------------------------------------------------------------------------

  private renderAndroidCard(
    data: ShareCardData,
    theme: ShareCardTheme,
    w: number,
    h: number,
    outputPath: string
  ): void {
    const Bitmap = android.graphics.Bitmap;
    const Canvas = android.graphics.Canvas;
    const bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
    const canvas = new Canvas(bitmap);

    this.drawAndroidGradient(canvas, theme, w, h);

    switch (data.type) {
      case 'daily':
        this.renderAndroidDailyContent(canvas, data, w, h);
        break;
      case 'milestone':
        this.renderAndroidMilestoneContent(canvas, data, w, h);
        break;
      case 'weekly':
        this.renderAndroidWeeklyContent(canvas, data, w, h);
        break;
      case 'monthly':
        this.renderAndroidMonthlyContent(canvas, data, w, h);
        break;
    }

    this.drawAndroidWatermark(canvas, w, h);

    const file = new java.io.File(outputPath);
    const out = new java.io.FileOutputStream(file);
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
    out.flush();
    out.close();
    bitmap.recycle();
  }

  private drawAndroidGradient(
    canvas: android.graphics.Canvas,
    theme: ShareCardTheme,
    w: number,
    h: number
  ): void {
    const g = SHARE_CARD_GRADIENTS.find((x) => x.id === theme) ??
      SHARE_CARD_GRADIENTS[0];
    const Color = android.graphics.Color;
    const paint = new android.graphics.Paint();
    paint.setShader(
      new android.graphics.LinearGradient(
        0, 0, w, h,
        Color.parseColor(g.color1),
        Color.parseColor(g.color2),
        android.graphics.Shader.TileMode.CLAMP
      )
    );
    canvas.drawRect(0, 0, w, h, paint);
  }

  private renderAndroidDailyContent(
    canvas: android.graphics.Canvas,
    data: DailyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const Color = android.graphics.Color;
    const white = Color.WHITE;
    const faded = Color.argb(230, 255, 255, 255);
    const subtle = Color.argb(179, 255, 255, 255);

    this.androidText(canvas, '🔥', w / 2, s ? 640 : 280,
      s ? 120 : 80, white, false);

    this.androidText(canvas, `Day ${data.currentStreak}`, w / 2, s ? 870 : 440,
      s ? 160 : 120, white, true);

    this.androidText(canvas, 'I prayed today', w / 2, s ? 970 : 590,
      s ? 50 : 40, faded, false);

    if (data.prayerType) {
      const label =
        data.prayerType.charAt(0).toUpperCase() + data.prayerType.slice(1);
      this.androidText(canvas, `· ${label} ·`, w / 2, s ? 1060 : 660,
        s ? 38 : 32, subtle, false);
    }
  }

  private renderAndroidMilestoneContent(
    canvas: android.graphics.Canvas,
    data: MilestoneCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const Color = android.graphics.Color;
    const white = Color.WHITE;
    const faded = Color.argb(230, 255, 255, 255);
    const subtle = Color.argb(179, 255, 255, 255);

    this.androidText(canvas, '⭐', w / 2, s ? 550 : 190,
      s ? 120 : 80, white, false);

    this.androidText(canvas, 'Milestone Unlocked!', w / 2, s ? 690 : 310,
      s ? 40 : 32, faded, false);

    this.androidText(canvas, data.title, w / 2, s ? 790 : 390,
      s ? 64 : 48, white, true);

    this.androidText(canvas, `${data.days}-day streak`, w / 2, s ? 880 : 460,
      s ? 42 : 34, faded, false);

    const linePaint = new android.graphics.Paint();
    linePaint.setColor(Color.argb(77, 255, 255, 255));
    linePaint.setAntiAlias(true);
    const lineY = s ? 930 : 510;
    canvas.drawRect((w - 160) / 2, lineY, (w + 160) / 2, lineY + 2, linePaint);

    if (data.quote) {
      this.androidText(canvas, `"${data.quote}"`, w / 2, s ? 1020 : 580,
        s ? 34 : 28, subtle, false);
    }
  }

  private renderAndroidWeeklyContent(
    canvas: android.graphics.Canvas,
    data: WeeklyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const Color = android.graphics.Color;
    const white = Color.WHITE;
    const faded = Color.argb(230, 255, 255, 255);
    const purple = Color.parseColor('#a78bfa');
    const cellW = w / 7;
    const circleR = s ? 35 : 28;

    this.androidText(canvas, 'Weekly Recap', w / 2, s ? 620 : 250,
      s ? 64 : 48, white, true);

    this.androidText(canvas, `${data.totalPrayers} of 7 days`, w / 2, s ? 710 : 330,
      s ? 42 : 34, faded, false);

    const labelY = s ? 860 : 450;
    const circleY = s ? 970 : 550;

    for (let i = 0; i < 7 && i < data.days.length; i++) {
      const cx = cellW * i + cellW / 2;
      const day = data.days[i];

      this.androidText(canvas, day.dayLabel, cx, labelY,
        s ? 28 : 22, faded, false);

      if (day.checked) {
        this.androidFilledCircle(canvas, cx, circleY, circleR, white);
      } else if (day.shielded) {
        this.androidFilledCircle(canvas, cx, circleY, circleR, purple);
      } else {
        this.androidStrokeCircle(canvas, cx, circleY, circleR,
          Color.argb(77, 255, 255, 255), 2);
      }
    }
  }

  private renderAndroidMonthlyContent(
    canvas: android.graphics.Canvas,
    data: MonthlyCardData,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const Color = android.graphics.Color;
    const white = Color.WHITE;
    const faded = Color.argb(230, 255, 255, 255);
    const subtle = Color.argb(128, 255, 255, 255);
    const purple = Color.parseColor('#a78bfa');
    const darkText = Color.parseColor('#1e3a5f');

    this.androidText(canvas, `${data.monthLabel} ${data.year}`, w / 2, s ? 430 : 140,
      s ? 64 : 48, white, true);

    this.androidText(canvas,
      `${data.totalPrayed} ${data.totalPrayed === 1 ? 'day' : 'days'} prayed`,
      w / 2, s ? 520 : 210, s ? 42 : 34, faded, false);

    const cellW = s ? 120 : 100;
    const cellH = s ? 100 : 80;
    const gridW = 7 * cellW;
    const gridX = (w - gridW) / 2;
    const headerY = s ? 660 : 310;
    const gridStartY = s ? 720 : 370;
    const circleR = s ? 22 : 18;
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const checkedSet = new Set(data.checkedDays);
    const shieldedSet = new Set(data.shieldedDays);

    for (let col = 0; col < 7; col++) {
      const cx = gridX + col * cellW + cellW / 2;
      this.androidText(canvas, dayHeaders[col], cx, headerY,
        s ? 28 : 22, faded, true);
    }

    for (let day = 1; day <= data.daysInMonth; day++) {
      const idx = data.firstDayOfWeek + day - 1;
      const col = idx % 7;
      const row = Math.floor(idx / 7);
      const cx = gridX + col * cellW + cellW / 2;
      const cy = gridStartY + row * cellH + cellH / 2;

      if (checkedSet.has(day)) {
        this.androidFilledCircle(canvas, cx, cy, circleR, white);
        this.androidText(canvas, `${day}`, cx, cy + (s ? 9 : 7),
          s ? 24 : 20, darkText, true);
      } else if (shieldedSet.has(day)) {
        this.androidFilledCircle(canvas, cx, cy, circleR, purple);
        this.androidText(canvas, `${day}`, cx, cy + (s ? 9 : 7),
          s ? 24 : 20, white, true);
      } else {
        this.androidText(canvas, `${day}`, cx, cy + (s ? 9 : 7),
          s ? 24 : 20, subtle, false);
      }
    }

    const statsY = gridStartY + 6 * cellH + (s ? 60 : 30);
    this.androidText(canvas,
      `Current streak: ${data.currentStreak} ${data.currentStreak === 1 ? 'day' : 'days'}`,
      w / 2, statsY, s ? 36 : 30, faded, false);
  }

  private drawAndroidWatermark(
    canvas: android.graphics.Canvas,
    w: number,
    h: number
  ): void {
    const s = h > w;
    const Color = android.graphics.Color;
    this.androidText(canvas, WATERMARK, w / 2, h - (s ? 45 : 35),
      s ? 30 : 26, Color.argb(128, 255, 255, 255), false);
  }

  // --- Android helpers ---

  private androidText(
    canvas: android.graphics.Canvas,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: number,
    bold: boolean
  ): void {
    const paint = new android.graphics.Paint();
    paint.setColor(color);
    paint.setTextSize(fontSize);
    paint.setTextAlign(android.graphics.Paint.Align.CENTER);
    paint.setAntiAlias(true);
    if (bold) {
      paint.setTypeface(
        android.graphics.Typeface.create('sans-serif', android.graphics.Typeface.BOLD)
      );
    }
    canvas.drawText(text, x, y, paint);
  }

  private androidFilledCircle(
    canvas: android.graphics.Canvas,
    cx: number,
    cy: number,
    r: number,
    color: number
  ): void {
    const paint = new android.graphics.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(android.graphics.Paint.Style.FILL);
    paint.setColor(color);
    canvas.drawCircle(cx, cy, r, paint);
  }

  private androidStrokeCircle(
    canvas: android.graphics.Canvas,
    cx: number,
    cy: number,
    r: number,
    color: number,
    lineWidth: number
  ): void {
    const paint = new android.graphics.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(android.graphics.Paint.Style.STROKE);
    paint.setStrokeWidth(lineWidth);
    paint.setColor(color);
    canvas.drawCircle(cx, cy, r, paint);
  }

  // ---------------------------------------------------------------------------
  // Share Sheets
  // ---------------------------------------------------------------------------

  private openShareSheet(imagePath: string): void {
    if (isIOS) {
      this.openIOSShareSheet(imagePath);
    } else {
      this.openAndroidShareSheet(imagePath);
    }
  }

  private openIOSShareSheet(imagePath: string): void {
    const image = UIImage.imageWithContentsOfFile(imagePath);
    if (!image) return;

    const items = NSArray.arrayWithArray([image]);
    const activityVC = UIActivityViewController.alloc()
      .initWithActivityItemsApplicationActivities(items, null);

    const rootVC = this.iosRootViewController();
    if (!rootVC) return;

    if (activityVC.popoverPresentationController) {
      activityVC.popoverPresentationController.sourceView = rootVC.view;
      activityVC.popoverPresentationController.sourceRect = CGRectMake(
        rootVC.view.bounds.size.width / 2,
        rootVC.view.bounds.size.height / 2,
        0,
        0
      );
    }

    rootVC.presentViewControllerAnimatedCompletion(activityVC, true, null);
  }

  private iosRootViewController(): UIViewController | null {
    const app = UIApplication.sharedApplication;
    const window = app.keyWindow ?? app.windows.objectAtIndex(0);
    let vc = window?.rootViewController ?? null;
    while (vc?.presentedViewController) {
      vc = vc.presentedViewController;
    }
    return vc;
  }

  private openAndroidShareSheet(imagePath: string): void {
    const ctx = Utils.android.getApplicationContext();
    const file = new java.io.File(imagePath);
    const authority = ctx.getPackageName() + '.provider';
    const contentUri = androidx.core.content.FileProvider.getUriForFile(
      ctx,
      authority,
      file
    );

    const intent = new android.content.Intent(
      android.content.Intent.ACTION_SEND
    );
    intent.setType('image/png');
    intent.putExtra(android.content.Intent.EXTRA_STREAM, contentUri);
    intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);

    const chooser = android.content.Intent.createChooser(
      intent,
      'Share your streak'
    );
    chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
    ctx.startActivity(chooser);
  }

  // ---------------------------------------------------------------------------
  // Instagram Stories Deep Link
  // ---------------------------------------------------------------------------

  private openIOSInstagramStories(imagePath: string): boolean {
    try {
      const url = NSURL.URLWithString(
        'instagram-stories://share?source_application=2075388079966914'
      );
      if (!UIApplication.sharedApplication.canOpenURL(url)) return false;

      const imageData = NSData.dataWithContentsOfFile(imagePath);
      if (!imageData) return false;

      const pasteboardItems = NSDictionary.dictionaryWithObjectForKey(
        imageData,
        'com.instagram.sharedSticker.backgroundImage'
      );
      (UIPasteboard.generalPasteboard as any).setItemsOptions(
        NSArray.arrayWithObject(pasteboardItems),
        NSDictionary.dictionary()
      );

      UIApplication.sharedApplication.openURLOptionsCompletionHandler(
        url,
        NSDictionary.dictionary(),
        null
      );
      return true;
    } catch {
      return false;
    }
  }

  private openAndroidInstagramStories(imagePath: string): boolean {
    try {
      const ctx = Utils.android.getApplicationContext();
      ctx.getPackageManager().getPackageInfo('com.instagram.android', 0);

      const file = new java.io.File(imagePath);
      const authority = ctx.getPackageName() + '.provider';
      const contentUri = androidx.core.content.FileProvider.getUriForFile(
        ctx, authority, file
      );

      const intent = new android.content.Intent(
        'com.instagram.share.ADD_TO_STORY'
      );
      intent.setDataAndType(contentUri, 'image/png');
      intent.putExtra('source_application', '2075388079966914');
      intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
      intent.setPackage('com.instagram.android');

      const activity =
        Application.android.foregroundActivity ??
        Application.android.startActivity;
      if (!activity) return false;

      activity.startActivityForResult(intent, 0);
      return true;
    } catch {
      return false;
    }
  }
}
