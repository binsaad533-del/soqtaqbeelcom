import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { InventoryItem } from "./types";

export const ConfirmationCard = ({
  item,
  allPhotoUrls,
  onConfirmSame,
  onConfirmMultiple,
}: {
  item: InventoryItem;
  allPhotoUrls: string[];
  onConfirmSame: () => void;
  onConfirmMultiple: (qty: number) => void;
}) => {
  const [showQtyInput, setShowQtyInput] = useState(false);
  const [tempQty, setTempQty] = useState(item.qty);

  return (
    <div className="bg-card rounded-lg p-3 border border-border/50">
      <div className="text-sm font-medium mb-1">{item.name}</div>
      <div className="text-[11px] text-muted-foreground mb-2">{item.detectionNote}</div>
      {item.photoIndices.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {item.photoIndices.filter((idx) => idx < allPhotoUrls.length).slice(0, 6).map((idx) => (
            <img key={idx} src={allPhotoUrls[idx]} alt="" className="w-14 h-14 rounded-md object-cover shrink-0 border border-border/30" />
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-2">هل هذه الصور لنفس الأصل أم لأصول متعددة؟</p>
      {!showQtyInput ? (
        <div className="flex gap-2">
          <button onClick={onConfirmSame} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors active:scale-[0.97]">هذا نفس الأصل</button>
          <button onClick={() => setShowQtyInput(true)} className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/80 transition-colors active:scale-[0.97]">هذه أصول متعددة</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">عدد القطع:</span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1">
            <button onClick={() => setTempQty((q) => Math.max(2, q - 1))} className="p-1"><Minus size={12} /></button>
            <input type="number" min="2" value={tempQty} onChange={(e) => setTempQty(Math.max(2, parseInt(e.target.value) || 2))} className="w-10 text-center text-xs bg-transparent border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <button onClick={() => setTempQty((q) => q + 1)} className="p-1"><Plus size={12} /></button>
          </div>
          <button onClick={() => onConfirmMultiple(tempQty)} className="text-xs px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors active:scale-[0.97]">تأكيد</button>
        </div>
      )}
    </div>
  );
};
