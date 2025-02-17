import { describe, it, expect } from "@jest/globals";

import { generateGoApi } from "../api.ts";
import { fixtures } from "../../__tests__/fixtures.ts";

describe("generateGoApi", () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const result = generateGoApi(fixture.name, fixture.api, "test", []);

      expect(result).toMatchSnapshot();
    });
  }
});
