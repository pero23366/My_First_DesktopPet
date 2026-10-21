using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace AI桌宠_V1._0._0
{
    /// <summary>
    /// 桌宠主窗口。
    ///
    /// 这一版相对上一版的结构性改动（都是网页版先做、这里跟上的）：
    /// 1. 设置全部走 PetSettings，Key / 模型 / 人设 / 自动收起只改一处就生效。
    /// 2. 人设文本只保留 DefaultPersona 一份（原来同一段话在这个文件里复制了三遍）。
    /// 3. 自动收起秒数来自设置（10~60），默认关闭，和网页版同一条规则。
    /// 4. 对话改由 ConversationStore 管：全量流水 + 最近 6 轮上下文 + 自动压缩的记忆。
    /// </summary>
    public partial class MainWindow : Window
    {
        /// <summary>缩放前（×1.0）的窗口尺寸。真正的大小 = 这个值 × PetSettings.PetScale。</summary>
        private const double BaseWidth = 700;
        private const double BaseHeight = 450;

        private readonly DeepSeekService _aiService = new DeepSeekService();
        private readonly PetSettings _settings;
        private readonly ConversationStore _store;

        private bool _isReasonerMode;
        private string _currentModel = "deepseek-chat";
        private bool _isCompressing;
        private bool _functionBarCollapsed;

        private readonly DispatcherTimer _bubbleTimer;
        private readonly DispatcherTimer _replyHideTimer;
        private readonly DispatcherTimer _idleTimer;

        private int _dotCount = 1;

        // 三帧待机动画
        private readonly BitmapImage[] _idleFrames;
        private int _idleFrameIndex;
        private int _idleDirection = 1;

        /*
         * 帧间补偿。数值来自网页版用 canvas 量出的不透明包围盒：
         * 帧 1 是基准，帧 2/3 是裁剪图，同宽度下显大，所以要缩小并挪回原位。
         * 三个数组下标与 _idleFrames 一一对应。
         */
        private static readonly double[] IdleScales = { 1.0, 0.905, 0.943 };
        private static readonly double[] IdleOffsetXRatio = { 0.0, -0.013, -0.021 };
        private static readonly double[] IdleOffsetYRatio = { 0.0, 0.038, 0.023 };

        public MainWindow()
        {
            InitializeComponent();

            _settings = PetSettings.Load();
            _store = ConversationStore.Load();

            // ---------- 1. 待机动画：先把三帧读进内存，避免每次切换都读盘 ----------
            _idleFrames = new BitmapImage[]
            {
                LoadIdleFrame("小沃_待机empty.png"),
                LoadIdleFrame("小沃_待机empty2.png"),
                LoadIdleFrame("小沃_待机empty3.png")
            };

            _idleTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(600) };
            _idleTimer.Tick += (s, e) => AdvanceIdleFrame();

            // ---------- 2. 思考气泡的省略号动画 ----------
            _bubbleTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(400) };
            _bubbleTimer.Tick += (s, e) =>
            {
                _dotCount = _dotCount % 3 + 1;
                ThinkingText.Text = new string('.', _dotCount);
            };

            // ---------- 3. 回复自动收起 ----------
            _replyHideTimer = new DispatcherTimer();
            _replyHideTimer.Tick += (s, e) =>
            {
                ReplyBubble.Visibility = Visibility.Collapsed;
                _replyHideTimer.Stop();
            };

            // ---------- 4. 事件 ----------
            this.KeyDown += Window_KeyDown;

            // 全屏卡死的兜底：万一有哪条路（脚本、贴顶、Win+↑）把窗口变成了最大化，立刻打回正常
            StateChanged += (s, e) =>
            {
                if (WindowState != WindowState.Normal) WindowState = WindowState.Normal;
            };

            // 鼠标左键拖动窗口：无边框桌宠的核心魔法
            this.MouseLeftButtonDown += (s, e) =>
            {
                if (e.ButtonState == MouseButtonState.Pressed) this.DragMove();
            };

            InputBox.KeyDown += (s, e) =>
            {
                if (e.Key == Key.Enter) SendButton_Click(this, new RoutedEventArgs());
            };

            ModelToggleButton.Click += ModelToggleButton_Click;

            // ---------- 5. 应用设置 ----------
            ApplySettings();
        }

        /// <summary>读一帧待机图。路径里带程序集名，换宿主程序也能找到资源。</summary>
        private static BitmapImage LoadIdleFrame(string fileName)
        {
            var frame = new BitmapImage();
            frame.BeginInit();
            frame.CacheOption = BitmapCacheOption.OnLoad; // 立刻解码进内存，之后不再依赖流
            frame.UriSource = new Uri(
                $"pack://application:,,,/AI桌宠_V1.0.0;component/Images/{fileName}",
                UriKind.Absolute);
            frame.EndInit();
            frame.Freeze();
            return frame;
        }

        // ==================== 设置 ====================

        /// <summary>
        /// 把 PetSettings 灌进界面与运行时状态。保存设置后也会调一次，
        /// 所以这里必须幂等：调几次结果都一样。
        /// </summary>
        private void ApplySettings()
        {
            _aiService.SetApiKey(_settings.ApiKey);

            // 模型：按钮文案与颜色跟着走
            ApplyModelUi();

            // 自动收起：默认关闭（对齐网页版需求 4）
            _replyHideTimer.Stop();
            _replyHideTimer.Interval = TimeSpan.FromSeconds(_settings.AutoHideSeconds);

            // 桌宠大小
            ApplyPetScale();

            // 形象：自定义图优先，有自定义图就不播三帧动画
            ApplyImage();
        }

        /// <summary>
        /// 主界面的「聊天 / 思考」按钮是设置的唯一真相来源之一：
        /// 点按钮会写回 PetSettings.Model，设置面板改完也会回到这里重刷文案。
        /// </summary>
        private void ApplyModelUi()
        {
            _isReasonerMode = string.Equals(_settings.Model, "deepseek-reasoner", StringComparison.OrdinalIgnoreCase);
            _currentModel = _isReasonerMode ? "deepseek-reasoner" : "deepseek-chat";

            ModelToggleButton.Content = _isReasonerMode ? "思考" : "聊天";
            ModelToggleButton.Foreground = _isReasonerMode
                ? System.Windows.Media.Brushes.RoyalBlue
                : System.Windows.Media.Brushes.Black;
        }

        /// <summary>
        /// 整窗等比缩放（设置里的 50%~150%）。
        ///
        /// 用 LayoutTransform 而不是 RenderTransform：LayoutTransform 参与布局，
        /// 窗口跟着撑大到 700×scale，文字是矢量重排、不会糊；RenderTransform 只是"画大"，
        /// 内容会被窗口边缘裁掉，字也糊。
        /// </summary>
        private void ApplyPetScale()
        {
            double scale = _settings.PetScale;

            // 屏幕装不下就别硬放：状态栏被顶到屏幕外，用户就再也点不回来了
            Rect area = SystemParameters.WorkArea;
            double fitScale = Math.Min((area.Width - 40) / BaseWidth, (area.Height - 40) / BaseHeight);
            if (fitScale > 0 && scale > fitScale) scale = fitScale;

            if (Content is FrameworkElement root)
            {
                root.LayoutTransform = new ScaleTransform(scale, scale);
            }

            Width = BaseWidth * scale;
            Height = BaseHeight * scale;
        }

        private void ApplyImage()
        {
            string path = PetSettings.CustomImagePath;

            if (_settings.UseCustomImage && File.Exists(path))
            {
                try
                {
                    var bitmap = new BitmapImage();
                    bitmap.BeginInit();
                    // OnLoad：把字节读进内存，否则文件句柄一放开图就白了
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.UriSource = new Uri(Path.GetFullPath(path));
                    bitmap.EndInit();
                    bitmap.Freeze();

                    PetImage.Source = bitmap;
                    _idleTimer.Stop();
                    ResetPetTransform();
                    return;
                }
                catch
                {
                    // 自定义图坏了就退回默认，不能因为一张图让桌宠起不来
                    _settings.UseCustomImage = false;
                }
            }

            PetImage.Source = _idleFrames[0];
            _idleFrameIndex = 0;
            _idleDirection = 1;
            ResetPetTransform();
            _idleTimer.Start();
        }

        private void AdvanceIdleFrame()
        {
            _idleFrameIndex += _idleDirection;

            // 走到两端就掉头：1→2→3→2→1……
            if (_idleFrameIndex <= 0 || _idleFrameIndex >= _idleFrames.Length - 1)
            {
                _idleDirection = -_idleDirection;
            }

            PetImage.Source = _idleFrames[_idleFrameIndex];

            PetScale.ScaleX = IdleScales[_idleFrameIndex];
            PetScale.ScaleY = IdleScales[_idleFrameIndex];
            PetOffset.X = IdleOffsetXRatio[_idleFrameIndex] * PetImage.Width;
            PetOffset.Y = IdleOffsetYRatio[_idleFrameIndex] * PetImage.Height;
        }

        private void ResetPetTransform()
        {
            PetScale.ScaleX = 1.0;
            PetScale.ScaleY = 1.0;
            PetOffset.X = 0;
            PetOffset.Y = 0;
        }

        private void OpenSettings()
        {
            var window = new SettingsWindow(_settings, ClearConversation) { Owner = this };
            window.ShowDialog();

            // 人设、模型、自动收起可能都改了；上下文是每次请求现拼的，所以不用重读历史
            if (window.Saved) ApplySettings();
        }

        // ==================== 窗口事件 ====================

        private void Window_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key != Key.Escape) return;

            // 设置窗开着时，Esc 只关设置窗 —— 否则按一下就把桌宠退了
            foreach (Window window in Application.Current.Windows)
            {
                if (window is SettingsWindow && window.IsVisible)
                {
                    window.Close();
                    return;
                }
            }

            // 防"幽灵进程"：没有设置窗时按 Esc 直接退出整个程序
            _store.Save();
            Application.Current.Shutdown();
        }

        /// <summary>历史记录：只读窗口。看完关掉，完全不影响上下文。</summary>
        private void HistoryButton_Click(object sender, RoutedEventArgs e)
        {
            var window = new HistoryWindow(_store) { Owner = this };
            window.ShowDialog();
        }

        private void BubbleCloseButton_Click(object sender, RoutedEventArgs e)
        {
            ReplyBubble.Visibility = Visibility.Collapsed;
            _replyHideTimer.Stop();
        }

        private void ExitButton_Click(object sender, RoutedEventArgs e)
        {
            _store.Save();
            Application.Current.Shutdown();
        }

        private void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            OpenSettings();
        }

        /// <summary>
        /// 功能栏收起 / 展开。
        /// 用 Hidden 而不是 Collapsed：Hidden 还占着布局位置，
        /// 所以收起后 ▾ 原地变成 ▴，不会跳到别的地方去。
        /// </summary>
        private void CollapseButton_Click(object sender, RoutedEventArgs e)
        {
            _functionBarCollapsed = !_functionBarCollapsed;

            var visibility = _functionBarCollapsed ? Visibility.Hidden : Visibility.Visible;
            ModelToggleButton.Visibility = visibility;
            SettingsButton.Visibility = visibility;
            InputRow.Visibility = visibility;

            CollapseButton.Content = _functionBarCollapsed ? "▴" : "▾";
            CollapseButton.ToolTip = _functionBarCollapsed ? "展开功能栏" : "收起功能栏";

            // 收起来的时候把焦点交还给窗口，免得看不见的输入框还在吃键盘
            if (_functionBarCollapsed) Focus();
        }

        private void ModelToggleButton_Click(object sender, RoutedEventArgs e)
        {
            _isReasonerMode = !_isReasonerMode;

            // 这个按钮也算改设置：存下来，重开程序还是你上次选的模型。
            // 走 PetSettings 而不是改局部变量，设置面板打开的才是同一个值。
            _settings.Model = _isReasonerMode ? "deepseek-reasoner" : "deepseek-chat";
            _settings.Save();

            ApplyModelUi();
        }

        // ==================== 发送 ====================

        private async void SendButton_Click(object sender, RoutedEventArgs e)
        {
            string userInput = InputBox.Text.Trim();
            if (string.IsNullOrWhiteSpace(userInput)) return;

            InputBox.Text = "";
            _store.Append("user", userInput);

            // 等回复：藏起旧气泡，亮出思考气泡
            ReplyBubble.Visibility = Visibility.Collapsed;
            ThinkingBubble.Visibility = Visibility.Visible;
            _bubbleTimer.Start();
            SendButton.IsEnabled = false;
            _replyHideTimer.Stop();

            try
            {
                // 人设 + 记忆 + 最近 6 轮。全量历史绝不直接进请求
                var messages = _store.BuildContext(_settings.PersonaPrompt);

                // 当前时间单独塞一条 system：模型没有时钟，不告诉它就会乱说日期
                messages.Insert(1, new ChatMessage
                {
                    Role = "system",
                    Content = $"当前系统时间：{DateTime.Now:yyyy-MM-dd HH:mm:ss}，星期{DateTime.Now.DayOfWeek}。"
                });

                string aiReply = await _aiService.GetResponseAsync(messages, _currentModel);

                // 错误文案不进历史：否则下次压缩会把"网络请求失败"当成小沃说过的话记下来
                if (!ConversationStore.IsErrorReply(aiReply))
                {
                    _store.Append("assistant", aiReply);
                }

                ThinkingBubble.Visibility = Visibility.Collapsed;
                _bubbleTimer.Stop();

                ReplyText.Text = aiReply;
                ReplyBubble.Visibility = Visibility.Visible;
                RestartReplyHideTimer();
            }
            catch (Exception ex)
            {
                ThinkingBubble.Visibility = Visibility.Collapsed;
                _bubbleTimer.Stop();

                ReplyText.Text = $"小沃哭了：{ex.Message}";
                ReplyBubble.Visibility = Visibility.Visible;
                RestartReplyHideTimer();
            }
            finally
            {
                _bubbleTimer.Stop();
                ThinkingBubble.Visibility = Visibility.Collapsed;
                SendButton.IsEnabled = true;

                _store.Save();

                // 攒够了就在后台压缩，不阻塞界面，也不影响这次回复
                if (_store.NeedsCompress) _ = CompressQuietlyAsync();
            }
        }

        /// <summary>只有开了自动收起才计时；没开就什么都不做，气泡一直留着。</summary>
        private void RestartReplyHideTimer()
        {
            _replyHideTimer.Stop();
            if (!_settings.AutoHideEnabled) return;

            _replyHideTimer.Interval = TimeSpan.FromSeconds(_settings.AutoHideSeconds);
            _replyHideTimer.Start();
        }

        /// <summary>
        /// 后台把旧对话压成记忆。失败就静默留在流水里，下次攒够再试。
        /// 固定用 deepseek-chat：压缩是机械活，不值得花 reasoner 的钱。
        /// </summary>
        private async Task CompressQuietlyAsync()
        {
            if (_isCompressing) return;

            // 没 Key 压不了 —— 此时上下文会退化成"只有最近 6 轮"，但功能不报错
            if (string.IsNullOrWhiteSpace(_settings.ApiKey)) return;

            _isCompressing = true;

            try
            {
                await _store.CompressAsync(_aiService, "deepseek-chat");
            }
            catch
            {
                // 压缩失败不影响聊天
            }
            finally
            {
                _isCompressing = false;
            }
        }

        // ==================== 清空 ====================

        private void ClearConversation()
        {
            _store.Clear();

            ReplyText.Text = "";
            ReplyBubble.Visibility = Visibility.Collapsed;
            _replyHideTimer.Stop();
        }
    }
}
