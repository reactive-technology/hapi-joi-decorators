import joi from '@hapi/joi';
import "reflect-metadata";
import { getSchema } from ".";
import { Optional, SchemaOptions } from "./decorators/BaseDecorators";

@SchemaOptions({allowUnknown: true})
class Test{
    @Optional()
    data: string;
}
async function main(){
    const t = {data: "test", test: false};
    const schema = getSchema(Test);
    const result = await schema.validate(t);
    console.log("Result", result);
}

main().catch(console.log);

