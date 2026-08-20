import { Button as AntButton } from "antd";

/**
 * Reusable Button component wrapping Ant Design Button.
 *
 * Props:
 * - variant: "primary" | "secondary" | "danger" | "text" (default: "primary")
 * - size: "small" | "medium" | "large" (default: "medium")
 * - loading: boolean
 * - disabled: boolean
 * - block: boolean (full width)
 * - icon: ReactNode
 * - onClick: function
 * - htmlType: "button" | "submit" | "reset"
 * - children: button text/content
 * - className: additional CSS classes
 */
const Button = ({
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  block = false,
  icon,
  onClick,
  htmlType = "button",
  children,
  className = "",
  ...rest
}) => {
  const variantMap = {
    primary: "primary",
    secondary: "",
    danger: "primary",
    text: "text",
  };

  const sizeMap = {
    small: "small",
    medium: "middle",
    large: "large",
  };

  const customClasses = [
    variant === "secondary" ? "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200" : "",
    variant === "danger" ? "text-red-500 hover:text-red-600 border-red-500 hover:border-red-600" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AntButton
      type={variantMap[variant]}
      size={sizeMap[size]}
      loading={loading}
      disabled={disabled}
      block={block}
      icon={icon}
      onClick={onClick}
      htmlType={htmlType}
      danger={variant === "danger"}
      className={customClasses}
      {...rest}
    >
      {children}
    </AntButton>
  );
};

export default Button;
