local function __TS__ArrayReduce(self, callbackFn, ...)
    local len = table.getn(self)
    local k = 0
    local accumulator = nil
    if __TS__CountVarargs(unpack(arg)) ~= 0 then
        accumulator = unpack(arg)
    elseif len > 0 then
        accumulator = self[1]
        k = 1
    else
        error("Reduce of empty array with no initial value", 0)
    end
    for i = k + 1, len do
        accumulator = callbackFn(
            nil,
            accumulator,
            self[i],
            i - 1,
            self
        )
    end
    return accumulator
end
