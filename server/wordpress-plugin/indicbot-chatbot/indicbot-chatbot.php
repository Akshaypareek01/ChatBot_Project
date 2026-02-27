<?php
/**
 * Plugin Name: IndicBot AI Chatbot
 * Plugin URI: https://github.com/your-org/indicbot
 * Description: One-click install of IndicBot AI chatbot widget. Add your script URL and User ID from the IndicBot dashboard.
 * Version: 1.0.0
 * Author: IndicBot
 * License: GPL v2 or later
 * Text Domain: indicbot-chatbot
 */

if (!defined('ABSPATH')) {
    exit;
}

define('INDICBOT_PLUGIN_VERSION', '1.0.0');

/**
 * Add settings link on Plugins page.
 */
function indicbot_plugin_action_links($links) {
    $settings_link = '<a href="' . admin_url('options-general.php?page=indicbot-chatbot') . '">' . __('Settings', 'indicbot-chatbot') . '</a>';
    array_unshift($links, $settings_link);
    return $links;
}
add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'indicbot_plugin_action_links');

/**
 * Register settings and admin page.
 */
function indicbot_register_settings() {
    register_setting('indicbot_settings', 'indicbot_script_url', array(
        'type'              => 'string',
        'sanitize_callback' => 'esc_url_raw',
    ));
    register_setting('indicbot_settings', 'indicbot_user_id', array(
        'type'              => 'string',
        'sanitize_callback' => 'sanitize_text_field',
    ));
}
add_action('admin_init', 'indicbot_register_settings');

/**
 * Add options page under Settings.
 */
function indicbot_add_options_page() {
    add_options_page(
        __('IndicBot Chatbot', 'indicbot-chatbot'),
        __('IndicBot Chatbot', 'indicbot-chatbot'),
        'manage_options',
        'indicbot-chatbot',
        'indicbot_render_options_page'
    );
}
add_action('admin_menu', 'indicbot_add_options_page');

/**
 * Render the settings form.
 */
function indicbot_render_options_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    $script_url = get_option('indicbot_script_url', '');
    $user_id    = get_option('indicbot_user_id', '');
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <form action="options.php" method="post">
            <?php settings_fields('indicbot_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="indicbot_script_url"><?php _e('Chatbot script URL', 'indicbot-chatbot'); ?></label></th>
                    <td>
                        <input type="url" id="indicbot_script_url" name="indicbot_script_url" value="<?php echo esc_attr($script_url); ?>" class="regular-text" placeholder="https://your-api.com/chatbot.js" />
                        <p class="description"><?php _e('Paste the full script URL from your IndicBot dashboard (e.g. https://api.yourdomain.com/chatbot.js).', 'indicbot-chatbot'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="indicbot_user_id"><?php _e('User ID', 'indicbot-chatbot'); ?></label></th>
                    <td>
                        <input type="text" id="indicbot_user_id" name="indicbot_user_id" value="<?php echo esc_attr($user_id); ?>" class="regular-text" placeholder="" />
                        <p class="description"><?php _e('Your User ID from the IndicBot dashboard (Embed / Install section).', 'indicbot-chatbot'); ?></p>
                    </td>
                </tr>
            </table>
            <?php submit_button(__('Save settings', 'indicbot-chatbot')); ?>
        </form>
        <p class="description"><?php _e('After saving, the chatbot will appear on your site. Clear any cache plugin if you use one.', 'indicbot-chatbot'); ?></p>
    </div>
    <?php
}

/**
 * Output the chatbot script in the footer.
 */
function indicbot_inject_script() {
    $script_url = get_option('indicbot_script_url', '');
    $user_id    = get_option('indicbot_user_id', '');
    if (empty($script_url) || empty($user_id)) {
        return;
    }
    $script_url = esc_url($script_url);
    $user_id    = esc_attr($user_id);
    echo '<script src="' . $script_url . '" data-user-id="' . $user_id . '" defer></script>' . "\n";
}
add_action('wp_footer', 'indicbot_inject_script', 99);
