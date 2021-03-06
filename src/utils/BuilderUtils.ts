import BaseJoi from "@hapi/joi";
import JoiDateExtensions from "@hapi/joi-date";
import {SchemaFunction} from "..";
import {getMetadata, getOptions, getGlobalArgs} from "./MetadataHelpers";
import {FieldDescription} from "..";

const Joi = BaseJoi.extend(JoiDateExtensions);
/**
 * Builds the schema for the string field
 * @param tp Field description metadata
 */

const savedSchemas: { [key: string]: BaseJoi.Schema } = {};

function buildJoiString(tp: FieldDescription) {
  if (tp.nonempty) {
    tp.minLength = Math.max(tp.minLength || 0, 1);
  }
  let val = Joi.string();
  if (tp.dateString) {
    val = Joi.date();
    if (tp.dateStringFormat) {
      val = val.format(tp.dateStringFormat);
    }
  }
  if (tp.minLength) {
    val = val.min(tp.minLength);
  }
  if (tp.maxLength) {
    val = val.max(tp.maxLength);
  }
  if (tp.email && !tp.dateString) {
    val = val.email();
  }
  return val;
}

function buildJoiDate(tp: FieldDescription) {
  let val = Joi.date();
  if (tp.dateString) {
    if (tp.dateStringFormat) {
      val = val.format(tp.dateStringFormat);
    }
  }
  return val;
}

/**
 * Builds the schema for the number field
 * @param tp Field description metadata
 */
function buildJoiNumber(tp: FieldDescription) {
  let val = Joi.number();
  if (tp.minValue) {
    val = val.min(tp.minValue.value);
    if (tp.minValue.exclude) {
      val = val.invalid(tp.minValue.value);
    }
  }
  if (tp.maxValue) {
    val = val.max(tp.maxValue.value);
    if (tp.maxValue.exclude) {
      val = val.invalid(tp.maxValue.value);
    }
  }
  if (tp.positive) {
    val = val.positive();
  }
  if (tp.alphanum) {
    val = val.alphanum();
  }
  if (tp.negative) {
    val = val.negative();
  }
  return val;
}

/**
 * Builds a Joi array schema
 * @param tp Field description metadata
 */
function buildJoiArray(tp: FieldDescription) {
  if (tp.nonempty) {
    tp.minLength = Math.max(tp.minLength || 0, 1);
  }
  let val = Joi.array();
  if (tp.typeInfo) {
    val = val.items(buildJoiChildren({designType: tp.typeInfo}));
  }
  if (tp.minLength) {
    val = val.min(tp.minLength);
  }
  if (tp.maxLength) {
    val = val.max(tp.maxLength);
  }
  return val;
}

/**
 * Builds the existing schema with global conditions for all types
 * @param val existing JOI schema
 * @param tp   Field description metadata
 */
function buildJoiGlobals(val: any, tp: FieldDescription) {
  if (tp.nullable) {
    val = val.allow(null);
  }
  if (tp.options && tp.options.length > 0) {
    val = val.valid(...tp.options);
  }
  if (tp.description) {
    val = val.description(tp.description);
  }
  if (tp.required) {
    val = val.required();
  } else {
    val = val.optional();
  }
  if (tp.customSchema) {
    const name = tp.customSchema.constructor.name;
    if (!!name && name === "Function") {
      if (!val) {
        val = BaseJoi.any().empty();
      }
      val = (tp.customSchema as SchemaFunction)(val);
    } else {
      val = tp.customSchema;
    }
  }
  const globals = getGlobalArgs(tp.designType);
  if (globals) {
    const name = globals.constructor.name;
    if (!!name && name === "Function") {
      if (!val) {
        val = BaseJoi.any().empty();
      }
      val = (tp.customSchema as SchemaFunction)(val);
    } else {
      val = globals;
    }
  }
  return val;
}

/**
 * Returns Joi schema for a non-primitive or array object
 * @param tp Field description metadata
 */
function buildJoiObject(tp: FieldDescription) {
  const payload: any = {};
  const metadata = getMetadata(tp.designType);
  if (!metadata) {
    return Joi.any();
  }
  Object.keys(metadata).forEach((x) => {
    payload[x] = buildJoiChildren(metadata[x]);
  });
  let result = Joi.object().keys(payload);
  const options = getOptions(tp.designType);
  if (options) {
    result = result.options(options);
  }
  return result;
}

/**
 * Checks the type of the field and returns the child schema accordingly
 * @param tp field description object
 */
function buildJoiChildren(tp: FieldDescription, defaultValue: any = null) {
  const primitives = ["String", "Boolean", "Number", "Array", "Date"];
  let val;
  if (primitives.includes(tp.designType.name)) {
    const typename = tp.designType.name;
    if (typename === "String") {
      val = buildJoiString(tp);
    } else if (typename === "Boolean") {
      val = Joi.boolean();
    } else if (typename === "Number") {
      val = buildJoiNumber(tp);
    } else if (typename === "Array") {
      val = buildJoiArray(tp);
    } else if (typename === "Date") {
      val = buildJoiDate(tp);
    }
  } else {
    val = buildJoiObject(tp);
  }
  val = buildJoiGlobals(val, tp)
  if (defaultValue) {
    val = val.default(defaultValue);
  }
  return val;
}

function getBaseClass(targetClass) {
  if (targetClass instanceof Function) {
    let baseClass = targetClass;

    while (baseClass) {
      const newBaseClass = Object.getPrototypeOf(baseClass);

      if (newBaseClass && newBaseClass !== Object && newBaseClass.name) {
        baseClass = newBaseClass;
      } else {
        break;
      }
    }

    return baseClass;
  }
}

/**
 * Returns the schema for the root type
 * @param tp type to validate
 */
function buildJoiRoot(tp: any): BaseJoi.Schema {
  const metadata = getMetadata(tp);
  const instance = new tp();
  if (!metadata) {
    return Joi.any();
  }
  const payload: any = {};
  Object.keys(metadata).forEach((x) => {
    payload[x] = buildJoiChildren(metadata[x], instance[x]);
  });

  let result = Joi.object().keys(payload);
  const options = getOptions(tp);
  if (options) {
    result = result.options(options);
  }
  const globals = getGlobalArgs(tp);
  if (globals) {
    const name = globals.constructor.name;
    if (!!name && name === "Function") {
      if (!result) {
        result = BaseJoi.any().empty();
      }
      result = (globals as SchemaFunction)(result);
    } else {
      result = globals;
    }
  }
  return result;
}

/**
 * Returns the schema for the root type
 * @param tp type to validate
 * @param save
 */
export function getSchema(tp: any, save: boolean = true): BaseJoi.Schema {
  if (savedSchemas[tp.name]) {
    return savedSchemas[tp.name];
  }
  const result = buildJoiRoot(tp);
  if (save) {
    savedSchemas[tp.name] = result;
  }
  return result;
}

export function getSchemaDescription(tp: any, save: boolean = true): BaseJoi.Description {
  return getSchema(tp, save).describe();
}

/**
 * Validates the object, returns the object if success, or throws a Joi Validation Error
 * @param obj Any object
 * @param save
 */
export async function Validate(obj: any, save: boolean = true) {
  const cp: any = obj.constructor;
  const validator: BaseJoi.Schema = getSchema(cp, save);
  return Joi.validate(obj, validator);
}

export class ClassValidator {
  static toObject() {
    return getSchema(this)
  }
}
