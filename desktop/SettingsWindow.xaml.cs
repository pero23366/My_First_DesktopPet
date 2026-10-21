using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using Microsoft.Win32;

namespace AI桌宠_V1._0._0
{
    /// <summary>
    /// 设置窗口。对应网页版设置面板的四段：形象 / 人设 / API / 对话。
    ///
    /// 两条原则：
    /// 1. 窗口里改的是「草稿」，点保存才落盘 —— 网页版的实时保存是因为它没有"取消"，
    ///    桌面窗口有取消按钮，实时保存会让取消变成假的。
    /// 2. 这个窗口不碰聊天逻辑，只回传「保存了什么」。清空对话这种要动运行时状态的，
    ///    通过构造时传进来的回调交回 MainWindow 做。
    /// </summary>
    public partial class SettingsWindow : Window
    {
        private readonly PetSettings _settings;
        private readonly Action _onClearHistory;

        private readonly PetSettings _draft = new PetSettings();

        /// <summary>用户在窗口里选了新形象时先攒着，保存时才落盘。null 表示没选新的。</summary>
        private string? _pendingImageDataUrl;

        public SettingsWindow(PetSettings settings, Action onClearHistory)
        {
            InitializeComponent();

            _settings = settings;
            _onClearHistory = onClearHistory;

            // 草稿从当前设置拷贝一份，取消就是丢掉这份草稿
            _draft.ApiKey = settings.ApiKey;
            _draft.Model = settings.Model;
            _draft.PersonaName = settings.PersonaName;
            _draft.PersonaPrompt = settings.PersonaPrompt;
            _draft.AutoHideEnabled = settings.AutoHideEnabled;
            _draft.AutoHideSeconds = settings.AutoHideSeconds;
            _draft.UseCustomImage = settings.UseCustomImage;
            _draft.PetScale = settings.PetScale;

            LoadIntoControls();

            // Esc 关窗口：网页版也是这个约定，别让桌面版比网页版更难用
            KeyDown += (s, e) =>
            {
                if (e.Key == Key.Escape) Close();
            };
        }

        /// <summary>保存成功返回 true，调用方据此决定要不要重新载入设置。</summary>
        public bool Saved { get; private set; }

        // ---------- 把草稿灌进控件 ----------

        private void LoadIntoControls()
        {
            PetNameBox.Text = _draft.PersonaName;
            PromptBox.Text = _draft.PersonaPrompt;
            ApiKeyBox.Password = _draft.ApiKey;

            SelectModel(_draft.Model);

            AutoHideCheck.IsChecked = _draft.AutoHideEnabled;
            AutoHideSlider.Value = _draft.AutoHideSeconds;
            UpdateAutoHideUi();

            PetScaleSlider.Value = Math.Round(_draft.PetScale * 100);
            UpdatePetScaleLabel(PetScaleSlider.Value);

            UpdateImageStateText();
            UpdateApiStateText();
        }

        /// <summary>50~150 的整数百分比 → 标签文案。</summary>
        private void UpdatePetScaleLabel(double percent)
        {
            PetScaleLabel.Text = $"桌宠大小：{(int)percent}%";
        }

        /// <summary>
        /// 模型下拉框和主界面的「聊天 / 思考」按钮共用一个真相：PetSettings.Model。
        /// 主界面点按钮 → 写 Model → 这里打开时读到的就是它；
        /// 这里选了 → Save 写回 Model → 主界面 ApplySettings 重刷按钮文案。
        /// 所以两边不需要互相引用，也不需要事件订阅。
        /// </summary>
        private void SelectModel(string model)
        {
            foreach (var item in ModelCombo.Items)
            {
                if (item is ComboBoxItem comboItem &&
                    string.Equals(comboItem.Tag as string, model, StringComparison.OrdinalIgnoreCase))
                {
                    ModelCombo.SelectedItem = comboItem;
                    return;
                }
            }

            ModelCombo.SelectedIndex = 0;
        }

        private string ReadModel()
        {
            if (ModelCombo.SelectedItem is ComboBoxItem item && item.Tag is string model)
            {
                return model;
            }

            return "deepseek-chat";
        }

        // ---------- 状态文案 ----------

        private void UpdateApiStateText()
        {
            bool hasKey = !string.IsNullOrWhiteSpace(ApiKeyBox.Password);
            ApiStateText.Text = hasKey ? "已填入 Key（明文存在本机 pet_settings.json）" : "还没填 Key";
            ApiStateText.Foreground = hasKey
                ? new SolidColorBrush(Color.FromRgb(0x2E, 0x7D, 0x32))
                : new SolidColorBrush(Color.FromRgb(0x8A, 0x90, 0xA2));
        }

        private void UpdateImageStateText()
        {
            ImageStateText.Text = _draft.UseCustomImage
                ? "自定义形象：pet_image.png（来自网页版配置）"
                : "默认形象（三帧待机动画）";
        }

        /// <summary>
        /// 勾选状态只控制滑块能不能拖。
        /// 桌面版没有网页版那句"对话消失后不可找回"的警告：气泡只是藏起来，
        /// 历史记录窗口里随时能翻到，没必要吓用户。
        /// </summary>
        private void UpdateAutoHideUi()
        {
            bool enabled = AutoHideCheck.IsChecked == true;

            AutoHideSlider.IsEnabled = enabled;
            AutoHideLabel.Text = $"收起时间：{(int)AutoHideSlider.Value} 秒";
        }

        // ---------- 事件 ----------

        private void AutoHideCheck_Click(object sender, RoutedEventArgs e)
        {
            UpdateAutoHideUi();
        }

        private void AutoHideSlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            // 构造期间控件还没建完，Label 可能为 null
            if (AutoHideLabel == null) return;
            AutoHideLabel.Text = $"收起时间：{(int)e.NewValue} 秒";
        }

        private void PetScaleSlider_ValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            if (PetScaleLabel == null) return;
            UpdatePetScaleLabel(e.NewValue);
        }

        private void ImportButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                Title = "选择网页版导出的配置",
                Filter = "网页版配置 (*.pet.json)|*.json|所有文件 (*.*)|*.*",
                CheckFileExists = true
            };

            if (dialog.ShowDialog(this) != true) return;

            if (!WebPetConfigLoader.TryLoad(dialog.FileName, out WebPetConfig config, out string error))
            {
                MessageBox.Show(this, error, "这个文件用不了", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 人设：网页版给的是拼好的成品，桌面端直接用它，不重新拼
            _draft.PersonaName = string.IsNullOrWhiteSpace(config.Persona.Name)
                ? DefaultPersona.Name
                : config.Persona.Name;
            _draft.PersonaPrompt = config.Persona.Prompt;

            PetNameBox.Text = _draft.PersonaName;
            PromptBox.Text = _draft.PersonaPrompt;

            // 形象：有图就用图，没图保持原状（不清掉用户已有的自定义形象）
            if (!string.IsNullOrWhiteSpace(config.Image))
            {
                _pendingImageDataUrl = config.Image;
                _draft.UseCustomImage = true;
                UpdateImageStateText();
            }

            MessageBox.Show(this, "配置已读入，点「保存」后才生效。", "导入成功",
                MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void ResetImageButton_Click(object sender, RoutedEventArgs e)
        {
            _pendingImageDataUrl = null;
            _draft.UseCustomImage = false;
            UpdateImageStateText();
        }

        private void ResetPersonaButton_Click(object sender, RoutedEventArgs e)
        {
            PetNameBox.Text = DefaultPersona.Name;
            PromptBox.Text = DefaultPersona.Prompt;
        }

        private void ClearHistoryButton_Click(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show(this, "清空之后聊天记录就找不回来了，确定吗？",
                "清空对话记录", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (result != MessageBoxResult.Yes) return;

            // 立刻生效：它不是"设置"，是"动作"，攒到保存反而让人以为没点着
            _onClearHistory?.Invoke();
            MessageBox.Show(this, "已经清空了。", "完成", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            Close();
        }

        private void SaveButton_Click(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(PromptBox.Text))
            {
                MessageBox.Show(this, "提示词不能为空，不填的话小沃会不知道自己是谁。",
                    "还差一点", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            // 形象先落盘：写文件可能失败，失败了就别把 UseCustomImage 打开
            if (!string.IsNullOrWhiteSpace(_pendingImageDataUrl))
            {
                if (!WebPetConfigLoader.TrySaveImage(_pendingImageDataUrl, PetSettings.CustomImagePath, out string error))
                {
                    MessageBox.Show(this, error, "形象没存下来", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }
            }

            _settings.ApiKey = ApiKeyBox.Password.Trim();
            _settings.Model = ReadModel();
            _settings.PersonaName = string.IsNullOrWhiteSpace(PetNameBox.Text)
                ? DefaultPersona.Name
                : PetNameBox.Text.Trim();
            _settings.PersonaPrompt = PromptBox.Text;
            _settings.PersonaVersion = DefaultPersona.Version;
            _settings.AutoHideEnabled = AutoHideCheck.IsChecked == true;
            _settings.AutoHideSeconds = (int)AutoHideSlider.Value;
            _settings.UseCustomImage = _draft.UseCustomImage;
            _settings.PetScale = PetScaleSlider.Value / 100.0;

            _settings.Save(); // 内部会夹一次秒数与缩放区间

            Saved = true;
            // 设置了 DialogResult 窗口会自己关，不要再调 Close()，否则是"关两次"
            DialogResult = true;
        }
    }
}
