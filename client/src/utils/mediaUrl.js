import API_CONFIG from "../config/api";

export const resolveMediaUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("/uploads")) {
    return `${API_CONFIG.BASE_URL}${value}`;
  }
  return value;
};

export const resolveImageAsset = (asset) => {
  if (!asset || typeof asset !== "object") return asset;
  return {
    ...asset,
    file_url: resolveMediaUrl(asset.file_url),
  };
};

export const resolveContentMediaUrls = (node) => {
  if (Array.isArray(node)) {
    return node.map(resolveContentMediaUrls);
  }

  if (!node || typeof node !== "object") {
    return node;
  }

  const resolvedNode = Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      if (key === "image_url") {
        return [key, resolveMediaUrl(value)];
      }

      if (key === "image_urls" && value && typeof value === "object") {
        return [
          key,
          Object.fromEntries(
            Object.entries(value).map(([imageKey, imageValue]) => [
              imageKey,
              resolveMediaUrl(imageValue),
            ])
          ),
        ];
      }

      if (key === "image_asset") {
        return [key, resolveImageAsset(value)];
      }

      return [key, resolveContentMediaUrls(value)];
    })
  );

  return resolvedNode;
};
