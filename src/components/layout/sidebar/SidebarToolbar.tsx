import { Button, DropdownMenu, IconButton, Tooltip } from "@radix-ui/themes";
import { ArchiveIcon, CameraIcon, LinkBreak2Icon, PlusIcon } from "@radix-ui/react-icons";

interface SidebarToolbarProps {
  isScanning: boolean;
  onCreateOpen: () => void;
  onPhotoScan: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImportOpen: () => void;
  showArchived: boolean;
  onToggleArchived: (show: boolean) => void;
  scanError: string | null;
}

export function SidebarToolbar({
  isScanning,
  onCreateOpen,
  onPhotoScan,
  onImportOpen,
  showArchived,
  onToggleArchived,
  scanError,
}: SidebarToolbarProps) {
  return (
    <div>
      <div className="flex gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button size="2" className="flex-1">
              <PlusIcon className="w-4 h-4 inline mr-1" />
              New Recipe
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={onCreateOpen}>
              <PlusIcon className="w-4 h-4 inline mr-2" />
              New blank recipe
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={onPhotoScan}
                  disabled={isScanning}
                  className="hidden"
                />
                <CameraIcon className="w-4 h-4 inline mr-2" />
                {isScanning ? "Scanning photo..." : "Scan from photo"}
              </label>
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={onImportOpen}>
              <LinkBreak2Icon className="w-4 h-4 inline mr-2" />
              Import from URL
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Tooltip content={showArchived ? "Show active recipes" : "Show archived recipes"}>
          <IconButton
            variant={showArchived ? "solid" : "outline"}
            size="2"
            onClick={() => onToggleArchived(!showArchived)}
            aria-label="Toggle archived recipes view"
          >
            <ArchiveIcon className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
      {scanError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {scanError}
        </div>
      )}
    </div>
  );
}
