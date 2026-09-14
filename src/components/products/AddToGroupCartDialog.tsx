import React, { useState, useEffect } from 'react';
import { ShoppingCart, Users, AlertTriangle, Minus, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { fetchGroups } from '../../store/slices/groupsSlice';
import {
  setCartGroup,
  addItem,
  clearCart,
  addToGroupCart,
} from '../../store/slices/cartSlice';
import type { CartItemData } from '../../store/slices/cartSlice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import type { Product } from '../../lib/types';
import type { Group } from '../../lib/types';
import type { Screen } from '../../App';
import { toast } from 'sonner';

interface AddToGroupCartDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  navigate: (screen: Screen, groupId?: string) => void;
}

export function AddToGroupCartDialog({
  open,
  onClose,
  product,
  navigate,
}: AddToGroupCartDialogProps) {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(state => state.groups.groups) as Group[];
  const groupsLoading = useAppSelector(state => state.groups.loading);
  const cartGroupId = useAppSelector(state => state.cart.groupId);
  const cartItems = useAppSelector(state => state.cart.items);

  const { user } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  // Fetch groups when dialog opens
  useEffect(() => {
    if (open && groups.length === 0) {
      dispatch(fetchGroups());
    }
  }, [open, groups.length, dispatch]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedGroupId('');
      setQuantity(1);
      setShowSwitchWarning(false);
      setPendingConfirm(false);
    }
  }, [open]);

  const currentCartGroupName =
    groups.find(g => g.id === cartGroupId)?.name ?? null;
  const hasCartForOtherGroup =
    cartGroupId != null &&
    cartItems.length > 0 &&
    selectedGroupId !== '' &&
    selectedGroupId !== cartGroupId;

  const handleAddToCart = async () => {
    if (!product || !selectedGroupId) return;

    const needToSwitch = cartGroupId != null && cartItems.length > 0 && selectedGroupId !== cartGroupId;

    if (needToSwitch && !pendingConfirm) {
      setShowSwitchWarning(true);
      setPendingConfirm(true);
      return;
    }

    if (needToSwitch) {
      dispatch(clearCart());
    }

    dispatch(setCartGroup(selectedGroupId));

    try {
      await dispatch(
        addToGroupCart({
          groupId: selectedGroupId,
          productId: product.id.toString(),
          quantity,
          memberId: user?.id,
        })
      ).unwrap();
      toast.success(`${product.name} (x${quantity}) added to group cart!`);
    } catch {
      // Fallback optimistic local dispatch if backend offline
      const currentUserId = user?.id || 'current-user';
      const existingItem = cartItems.find(item => item.productId === product.id.toString());
      const newTotalQty = existingItem ? existingItem.quantity + quantity : quantity;
      const existingAlloc = existingItem?.allocations?.find(a => a.memberId === currentUserId);
      const otherAllocs = existingItem?.allocations?.filter(a => a.memberId !== currentUserId) || [];
      const newAllocQty = existingAlloc ? existingAlloc.quantity + quantity : quantity;

      const cartItem: CartItemData = {
        productId: product.id.toString(),
        quantity: newTotalQty,
        allocations: [...otherAllocs, { memberId: currentUserId, quantity: newAllocQty }],
      };
      dispatch(addItem(cartItem));
      toast.success(`${product.name} (x${quantity}) added to group cart!`);
    }

    onClose();
    setShowSwitchWarning(false);
    setPendingConfirm(false);
  };

  const handleCancelSwitch = () => {
    setShowSwitchWarning(false);
    setPendingConfirm(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#0047AB]" />
            Add to Group Cart
          </DialogTitle>
          <DialogDescription>
            Choose which group to add <strong>{product.name}</strong> to.
          </DialogDescription>
        </DialogHeader>

        {groupsLoading && groups.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              You don't have any groups yet. Create or join a group to add products to a group cart.
            </p>
            <Button
              className="w-full bg-[#0047AB] hover:bg-[#0047AB]/90"
              onClick={() => {
                onClose();
                navigate('group-create');
              }}
            >
              Create a Group
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onClose();
                navigate('groups');
              }}
            >
              Browse Groups
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="group-select">Select group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={value => {
                  setSelectedGroupId(value);
                  setShowSwitchWarning(false);
                  setPendingConfirm(false);
                }}
              >
                <SelectTrigger id="group-select">
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{group.name}</span>
                        {group.member_count != null && (
                          <span className="text-xs text-gray-500">
                            ({group.member_count} members)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity Stepper */}
            <div className="space-y-2">
              <Label>Quantity to Contribute</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-semibold text-lg">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setQuantity(prev => prev + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-500 ml-2">
                  (MOQ: {product.moq || 1} units)
                </span>
              </div>
            </div>

            {showSwitchWarning && hasCartForOtherGroup && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have items in your cart for <strong>{currentCartGroupName}</strong>.
                  Switching groups will clear your current cart. Continue?
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {showSwitchWarning && pendingConfirm ? (
                <>
                  <Button variant="outline" onClick={handleCancelSwitch}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#0047AB] hover:bg-[#0047AB]/90"
                    onClick={handleAddToCart}
                  >
                    Clear cart and add to {groups.find(g => g.id === selectedGroupId)?.name}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-[#6EE7B7] hover:bg-[#6EE7B7]/90 text-[#0047AB]"
                    onClick={handleAddToCart}
                    disabled={!selectedGroupId}
                  >
                    Add to Cart
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
