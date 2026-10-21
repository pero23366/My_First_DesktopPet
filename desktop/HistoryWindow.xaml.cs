using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace AI桌宠_V1._0._0
{
    /// <summary>
    /// 历史记录窗口。用代码拼列表而不是 XAML 里写 ItemsSource + DataTemplate，
    /// 因为每条消息的样式差别只有两三个颜色，硬套模板反而更难读。
    /// </summary>
    public partial class HistoryWindow : Window
    {
        private static readonly Brush PetForeground = new SolidColorBrush(Color.FromRgb(0x1F, 0x23, 0x33));
        private static readonly Brush MeForeground = new SolidColorBrush(Color.FromRgb(0x2B, 0x3B, 0x7A));

        private static readonly Brush PetBackground = new SolidColorBrush(Color.FromRgb(0xFF, 0xFF, 0xFF));
        private static readonly Brush MeBackground = new SolidColorBrush(Color.FromRgb(0xE9, 0xEE, 0xFF));

        public HistoryWindow(ConversationStore store)
        {
            InitializeComponent();

            CountText.Text = $"共 {store.Messages.Count} 条对话 · 其中 {store.UncoveredCount} 条还没进记忆";

            if (!string.IsNullOrWhiteSpace(store.Memory))
            {
                MemoryBox.Visibility = Visibility.Visible;
                MemoryText.Text = store.Memory;
            }

            if (store.Messages.Count == 0)
            {
                MessagePanel.Children.Add(BuildHint("还没有聊过天。"));
                return;
            }

            foreach (var message in store.Messages)
            {
                MessagePanel.Children.Add(BuildMessage(message));
            }

            // 打开时滚到最底下：用户最想看的通常是最近说了什么
            Loaded += (s, e) => MessageScroll.ScrollToEnd();
        }

        private static Border BuildHint(string text)
        {
            return new Border
            {
                Background = Brushes.Transparent,
                Child = new TextBlock
                {
                    Text = text,
                    FontSize = 12,
                    Foreground = new SolidColorBrush(Color.FromRgb(0x8A, 0x90, 0xA2))
                }
            };
        }

        private static Border BuildMessage(StoredMessage message)
        {
            bool fromUser = message.Role == "user";

            var header = new TextBlock
            {
                Text = (fromUser ? "枕头" : "小沃") + " · " + message.Time.ToString("MM-dd HH:mm"),
                FontSize = 10,
                Foreground = new SolidColorBrush(Color.FromRgb(0x8A, 0x90, 0xA2)),
                Margin = new Thickness(0, 0, 0, 4)
            };

            var body = new TextBlock
            {
                Text = message.Content,
                FontSize = 13,
                TextWrapping = TextWrapping.Wrap,
                Foreground = fromUser ? MeForeground : PetForeground
            };

            var stack = new StackPanel();
            stack.Children.Add(header);
            stack.Children.Add(body);

            return new Border
            {
                Background = fromUser ? MeBackground : PetBackground,
                BorderBrush = new SolidColorBrush(Color.FromRgb(0xE3, 0xE6, 0xEF)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(10, 8, 10, 8),
                Margin = new Thickness(fromUser ? 24 : 0, 0, fromUser ? 0 : 24, 8),
                Child = stack
            };
        }
    }
}
