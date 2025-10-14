import { renderHook, act } from "@testing-library/react";
import {
  useArraySection,
  createRequiredFieldValidator,
  createArrayItemValidator,
  createFieldProps,
} from "../arrayUtils";

describe("arrayUtils", () => {
  describe("useArraySection", () => {
    const mockOnUpdate = jest.fn();
    const mockOnSave = jest.fn();
    const mockCreateNewItem = jest.fn(() => ({ id: "1", name: "New Item" }));
    const mockValidateItem = jest.fn(() => true);

    const defaultConfig = {
      initialData: [{ id: "1", name: "Item 1" }],
      createNewItem: mockCreateNewItem,
      validateItem: mockValidateItem,
      onUpdate: mockOnUpdate,
      onSave: mockOnSave,
      autoSaveMessage: "Test save",
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should initialize with correct data", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      expect(result.current.data).toEqual([{ id: "1", name: "Item 1" }]);
    });

    it("should add item", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      act(() => {
        result.current.addItem();
      });

      expect(mockCreateNewItem).toHaveBeenCalled();
      expect(mockOnUpdate).toHaveBeenCalledWith([
        { id: "1", name: "Item 1" },
        { id: "1", name: "New Item" },
      ]);
      expect(mockOnSave).toHaveBeenCalledWith(
        [
          { id: "1", name: "Item 1" },
          { id: "1", name: "New Item" },
        ],
        "Test save - Item added",
      );
    });

    it("should remove item", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      act(() => {
        result.current.removeItem(0);
      });

      expect(result.current.data).toEqual([]);
      expect(mockOnUpdate).toHaveBeenCalledWith([]);
      expect(mockOnSave).toHaveBeenCalledWith([], "Test save - Item removed");
    });

    it("should update item", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      act(() => {
        result.current.updateItem(0, "name", "Updated Item");
      });

      expect(result.current.data).toEqual([{ id: "1", name: "Updated Item" }]);
      expect(mockOnUpdate).toHaveBeenCalledWith([
        { id: "1", name: "Updated Item" },
      ]);
    });

    it("should validate item", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      const isValid = result.current.isItemValid({ id: "1", name: "Test" });

      expect(mockValidateItem).toHaveBeenCalledWith({ id: "1", name: "Test" });
      expect(isValid).toBe(true);
    });

    it("should check if form is valid", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));

      const isFormValid = result.current.isFormValid();

      expect(mockValidateItem).toHaveBeenCalled();
      expect(isFormValid).toBe(true);
    });

    it("should reset data", () => {
      const { result } = renderHook(() => useArraySection(defaultConfig));
      const newData = [{ id: "2", name: "New Data" }];

      act(() => {
        result.current.resetData(newData);
      });

      expect(result.current.data).toEqual(newData);
    });
  });

  describe("createRequiredFieldValidator", () => {
    it("should validate required fields", () => {
      const validator = createRequiredFieldValidator(["id", "name"]);
      const validItem = { id: "1", name: "Item 1" };

      expect(validator(validItem)).toBe(true);
    });

    it("should invalidate missing required fields", () => {
      const validator = createRequiredFieldValidator(["id", "name"]);
      const invalidItem = { id: "1" };

      expect(validator(invalidItem)).toBe(false);
    });

    it("should invalidate empty required fields", () => {
      const validator = createRequiredFieldValidator(["id", "name"]);
      const invalidItem = { id: "1", name: "" };

      expect(validator(invalidItem)).toBe(false);
    });

    it("should handle whitespace-only fields", () => {
      const validator = createRequiredFieldValidator(["id", "name"]);
      const invalidItem = { id: "1", name: "   " };

      expect(validator(invalidItem)).toBe(false);
    });
  });

  describe("createArrayItemValidator", () => {
    it("should be an alias for createRequiredFieldValidator", () => {
      expect(createArrayItemValidator).toBe(createRequiredFieldValidator);
    });
  });

  describe("createFieldProps", () => {
    const mockOnChange = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should create basic field props", () => {
      const props = createFieldProps("test value", mockOnChange);

      expect(props).toEqual({
        value: "test value",
        onChange: expect.any(Function),
        error: false,
        helperText: "",
        variant: "standard",
        fullWidth: true,
      });
    });

    it("should handle empty value", () => {
      const props = createFieldProps("", mockOnChange);

      expect(props.value).toBe("");
    });

    it("should handle null value", () => {
      const props = createFieldProps(null as any, mockOnChange);

      expect(props.value).toBe("");
    });

    it("should create required field props", () => {
      const props = createFieldProps(
        "",
        mockOnChange,
        true,
        "This field is required",
      );

      expect(props.error).toBe(true);
      expect(props.helperText).toBe("This field is required");
    });

    it("should not show error for valid required field", () => {
      const props = createFieldProps(
        "valid value",
        mockOnChange,
        true,
        "This field is required",
      );

      expect(props.error).toBe(false);
      expect(props.helperText).toBe("");
    });

    it("should call onChange with target value", () => {
      const props = createFieldProps("test", mockOnChange);
      const mockEvent = { target: { value: "new value" } } as any;

      props.onChange(mockEvent);

      expect(mockOnChange).toHaveBeenCalledWith("new value");
    });
  });
});
