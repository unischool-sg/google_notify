import { describe, it, expect } from "vitest";

const joinPaths = (parent: string, child: string): string => {
  if (child === "/") return "/";
  if (child.startsWith("/")) return child;
  const p = parent === "" || parent === "/" ? "" : parent;
  return `${p}/${child}`.replace(/\/+/g, "/");
};

interface BaseRoute {
  path: string;
  element: React.ReactNode;
}

interface HasChildrenRoute extends BaseRoute {
  children?: HasChildrenRoute[];
}

const flattenRoutes = (
  route: HasChildrenRoute,
  parent = "",
): BaseRoute[] => {
  const fullPath = joinPaths(parent, route.path);
  const me: BaseRoute = { path: fullPath, element: route.element };
  const kids = route.children
    ? route.children.flatMap((child) => flattenRoutes(child, fullPath))
    : [];
  return [me, ...kids];
};

describe("joinPaths", () => {
  it('returns "/" when child is "/"', () => {
    expect(joinPaths("", "/")).toBe("/");
    expect(joinPaths("/parent", "/")).toBe("/");
    expect(joinPaths("parent", "/")).toBe("/");
  });

  it("returns child when child starts with /", () => {
    expect(joinPaths("", "/foo")).toBe("/foo");
    expect(joinPaths("/parent", "/foo")).toBe("/foo");
  });

  it("joins parent and child with /", () => {
    expect(joinPaths("", "foo")).toBe("/foo");
    expect(joinPaths("/parent", "foo")).toBe("/parent/foo");
  });

  it("handles empty parent gracefully", () => {
    expect(joinPaths("", "foo")).toBe("/foo");
  });

  it("normalizes double slashes", () => {
    expect(joinPaths("/parent/", "/child")).toBe("/child");
    expect(joinPaths("/parent", "foo/bar")).toBe("/parent/foo/bar");
  });
});

describe("flattenRoutes", () => {
  it("flattens a single route without children", () => {
    const route: HasChildrenRoute = {
      path: "/",
      element: <div />,
    };
    const result = flattenRoutes(route);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("/");
  });

  it("flattens a route with nested children", () => {
    const route: HasChildrenRoute = {
      path: "/parent",
      element: <div />,
      children: [
        {
          path: "child1",
          element: <div />,
          children: [
            { path: "grandchild", element: <div /> },
          ],
        },
        {
          path: "child2",
          element: <div />,
        },
      ],
    };
    const result = flattenRoutes(route);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe("/parent");
    expect(result[1].path).toBe("/parent/child1");
    expect(result[2].path).toBe("/parent/child1/grandchild");
    expect(result[3].path).toBe("/parent/child2");
  });

  it("handles root-level children", () => {
    const route: HasChildrenRoute = {
      path: "",
      element: <div />,
      children: [
        { path: "foo", element: <div /> },
        { path: "bar", element: <div /> },
      ],
    };
    const result = flattenRoutes(route);
    expect(result).toHaveLength(3);
    expect(result[0].path).toBe("/");
    expect(result[1].path).toBe("/foo");
    expect(result[2].path).toBe("/bar");
  });
});
