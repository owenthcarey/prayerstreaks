import { Injectable } from '@angular/core';
import {
  Application,
  ImageSource,
  Utils,
  isIOS,
  knownFolders,
  path,
} from '@nativescript/core';

const IMG_WIDTH = 1080;
const IMG_HEIGHT = 1080;
const SHARE_FILENAME = 'prayer-streak-share.png';

@Injectable({ providedIn: 'root' })
export class ShareService {
  shareStreak(currentStreak: number, longestStreak: number): void {
    try {
      const imagePath = this.generateShareImage(currentStreak, longestStreak);
      this.openShareSheet(imagePath);
    } catch (err) {
      console.error('ShareService: failed to share streak', err);
    }
  }

  private generateShareImage(
    currentStreak: number,
    longestStreak: number
  ): string {
    const tempPath = path.join(
      knownFolders.temp().path,
      SHARE_FILENAME
    );

    if (isIOS) {
      this.generateIOSImage(currentStreak, longestStreak, tempPath);
    } else {
      this.generateAndroidImage(currentStreak, longestStreak, tempPath);
    }

    return tempPath;
  }

  // ---------------------------------------------------------------------------
  // iOS — Core Graphics
  // ---------------------------------------------------------------------------

  private generateIOSImage(
    currentStreak: number,
    longestStreak: number,
    outputPath: string
  ): void {
    const w = IMG_WIDTH;
    const h = IMG_HEIGHT;
    const longestLabel = `Longest streak · ${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`;

    UIGraphicsBeginImageContextWithOptions(CGSizeMake(w, h), true, 1);
    const ctx = UIGraphicsGetCurrentContext();

    // Vibrant blue gradient (medium blue → sky blue)
    const colorSpace = CGColorSpaceCreateDeviceRGB();
    const c1 = UIColor.alloc().initWithRedGreenBlueAlpha(0.145, 0.388, 0.922, 1.0);
    const c2 = UIColor.alloc().initWithRedGreenBlueAlpha(0.576, 0.773, 0.992, 1.0);
    const colors = NSArray.arrayWithArray([c1.CGColor, c2.CGColor]);
    const gradient = CGGradientCreateWithColors(colorSpace, colors, null);
    CGContextDrawLinearGradient(
      ctx,
      gradient,
      CGPointMake(0, 0),
      CGPointMake(w, h),
      CGGradientDrawingOptions.kCGGradientDrawsBeforeStartLocation
    );

    const white = UIColor.whiteColor;
    const center = NSMutableParagraphStyle.alloc().init();
    center.alignment = NSTextAlignment.Center;

    // Streak number (hero element)
    this.iosText(
      `${currentStreak}`, 260, w,
      UIFont.systemFontOfSizeWeight(220, UIFontWeightBold),
      white, center
    );

    // Subtitle
    this.iosText(
      'day prayer streak', 530, w,
      UIFont.systemFontOfSizeWeight(50, UIFontWeightMedium),
      UIColor.alloc().initWithWhiteAlpha(1.0, 0.9), center
    );

    // Thin centered divider line
    CGContextSetFillColorWithColor(
      ctx,
      UIColor.alloc().initWithWhiteAlpha(1.0, 0.3).CGColor
    );
    CGContextFillRect(ctx, CGRectMake((w - 160) / 2, 630, 160, 2));

    // Longest streak stat
    this.iosText(
      longestLabel, 680, w,
      UIFont.systemFontOfSize(34),
      UIColor.alloc().initWithWhiteAlpha(1.0, 0.7), center
    );

    // App name
    this.iosText(
      'Prayer Streaks', 940, w,
      UIFont.systemFontOfSizeWeight(38, UIFontWeightSemibold),
      UIColor.alloc().initWithWhiteAlpha(1.0, 0.8), center
    );

    const image = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();

    const data = UIImagePNGRepresentation(image);
    data.writeToFileAtomically(outputPath, true);
  }

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
      [
        NSFontAttributeName,
        NSForegroundColorAttributeName,
        NSParagraphStyleAttributeName,
      ]
    );
    const size = str.sizeWithAttributes(attrs);
    str.drawInRectWithAttributes(
      CGRectMake(0, y, width, size.height),
      attrs
    );
  }

  // ---------------------------------------------------------------------------
  // Android — Canvas / Bitmap
  // ---------------------------------------------------------------------------

  private generateAndroidImage(
    currentStreak: number,
    longestStreak: number,
    outputPath: string
  ): void {
    const w = IMG_WIDTH;
    const h = IMG_HEIGHT;
    const longestLabel = `Longest streak · ${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`;

    const Bitmap = android.graphics.Bitmap;
    const Canvas = android.graphics.Canvas;
    const Color = android.graphics.Color;
    const LinearGradient = android.graphics.LinearGradient;

    const bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
    const canvas = new Canvas(bitmap);

    // Vibrant blue gradient (medium blue → sky blue)
    const bgPaint = new android.graphics.Paint();
    bgPaint.setShader(
      new LinearGradient(
        0, 0, w, h,
        Color.parseColor('#2563eb'),
        Color.parseColor('#93c5fd'),
        android.graphics.Shader.TileMode.CLAMP
      )
    );
    canvas.drawRect(0, 0, w, h, bgPaint);

    const white = Color.WHITE;

    // Streak number (hero element)
    this.androidText(canvas, `${currentStreak}`, w / 2, 480, 220, white, true);

    // Subtitle
    this.androidText(canvas, 'day prayer streak', w / 2, 580, 50, Color.argb(230, 255, 255, 255), false);

    // Thin centered divider line
    const linePaint = new android.graphics.Paint();
    linePaint.setColor(Color.argb(77, 255, 255, 255));
    linePaint.setAntiAlias(true);
    canvas.drawRect((w - 160) / 2, 630, (w + 160) / 2, 632, linePaint);

    // Longest streak stat
    this.androidText(canvas, longestLabel, w / 2, 715, 34, Color.argb(179, 255, 255, 255), false);

    // App name
    this.androidText(canvas, 'Prayer Streaks', w / 2, 978, 38, Color.argb(204, 255, 255, 255), false);

    const file = new java.io.File(outputPath);
    const out = new java.io.FileOutputStream(file);
    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
    out.flush();
    out.close();
    bitmap.recycle();
  }

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
        android.graphics.Typeface.create(
          'sans-serif',
          android.graphics.Typeface.BOLD
        )
      );
    }
    canvas.drawText(text, x, y, paint);
  }

  // ---------------------------------------------------------------------------
  // Native Share Sheets
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

    // iPad requires a popover source; anchor to the center of the screen
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
}
