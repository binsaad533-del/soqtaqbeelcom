import moqbilAvatar from "@/assets/moqbil-avatar.png";
import { cn } from "@/lib/utils";

interface MoqbilAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

const MoqbilAvatar = ({ size = 32, className, animate = false }: MoqbilAvatarProps) => (
  <img
    src={moqbilAvatar}
    alt="مقبل"
    width={size}
    height={size}
    className={cn(
      "rounded-full object-cover",
      animate && "animate-pulse",
      className
    )}
    style={{ width: size, height: size }}
  />
);

export default MoqbilAvatar;
