import { ReactNode } from "react";
import { motion } from "motion/react";

interface NoticeProps {
  message?: ReactNode;
  type?: "wait" | "help" | "warn" | "none";
  children?: ReactNode;
}

const Notice = ({
  message = "An error occurred.",
  type = "warn",
  children,
}: NoticeProps) => {
  return (
    <div className="primary">
      <motion.div
        className="empty-list"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="empty-list-box">
          {type === "wait" && <i className="ai-fill ai-hourglass notice-icon" aria-hidden />}
          {type === "help" && <i className="ai-fill ai-circle-questionmark notice-icon" aria-hidden />}
          {type === "warn" && (
            <img
              className="notice-art"
              src={`${import.meta.env.BASE_URL}img/empty-state.png`}
              alt=""
              width={1800}
              height={1348}
            />
          )}
          <p>{message}</p>
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default Notice;
