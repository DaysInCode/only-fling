using System.Collections.Immutable;
using System.Net;
using System.Security.Claims;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Context.Features;
using Microsoft.Azure.Functions.Worker.Http;

namespace OnlyFling.Api.Bdd.Support;

internal sealed class TestFunctionContext : FunctionContext
{
    private readonly TraceContext _traceContext = new TestTraceContext();
    private readonly BindingContext _bindingContext = new TestBindingContext();

    public TestFunctionContext(IServiceProvider instanceServices)
    {
        InstanceServices = instanceServices;
    }

    public override string InvocationId { get; } = Guid.NewGuid().ToString("N");
    public override string FunctionId { get; } = "bdd-function";
    public override TraceContext TraceContext => _traceContext;
    public override BindingContext BindingContext => _bindingContext;
    public override RetryContext RetryContext => null!;
    public override IServiceProvider InstanceServices { get; set; }
    public override FunctionDefinition FunctionDefinition { get; } = new TestFunctionDefinition();
    public override IDictionary<object, object> Items { get; set; } = new Dictionary<object, object>();
    public override IInvocationFeatures Features => null!;
    public override CancellationToken CancellationToken { get; } = CancellationToken.None;
}

internal sealed class TestHttpRequestData(FunctionContext functionContext, Uri url, string method, Stream body) : HttpRequestData(functionContext)
{
    public override Stream Body { get; } = body;
    public override HttpHeadersCollection Headers { get; } = [];
    public override IReadOnlyCollection<IHttpCookie> Cookies { get; } = Array.Empty<IHttpCookie>();
    public override Uri Url { get; } = url;
    public override IEnumerable<ClaimsIdentity> Identities { get; } = Array.Empty<ClaimsIdentity>();
    public override string Method { get; } = method;
    public override HttpResponseData CreateResponse() => new TestHttpResponseData(FunctionContext);
}

internal sealed class TestHttpResponseData(FunctionContext functionContext) : HttpResponseData(functionContext)
{
    public override HttpStatusCode StatusCode { get; set; }
    public override HttpHeadersCollection Headers { get; set; } = [];
    public override Stream Body { get; set; } = new MemoryStream();
    public override HttpCookies Cookies { get; } = new TestHttpCookies();
}

internal sealed class TestHttpCookies : HttpCookies
{
    private readonly List<IHttpCookie> _cookies = [];

    public override void Append(string name, string value) => _cookies.Add(new TestHttpCookie(name, value));

    public override void Append(IHttpCookie cookie) => _cookies.Add(cookie);

    public override IHttpCookie CreateNew() => new TestHttpCookie(string.Empty, string.Empty);
}

internal sealed class TestHttpCookie(string name, string value) : IHttpCookie
{
    public string Name { get; } = name;
    public string Value { get; } = value;
    public DateTimeOffset? Expires { get; set; }
    public double? MaxAge { get; set; }
    public string? Domain { get; set; }
    public string? Path { get; set; }
    public bool? Secure { get; set; }
    public bool? HttpOnly { get; set; }
    public SameSite SameSite { get; set; } = SameSite.None;
}

internal sealed class TestTraceContext : TraceContext
{
    public override string TraceParent => string.Empty;
    public override string TraceState => string.Empty;
}

internal sealed class TestBindingContext : BindingContext
{
    public override IReadOnlyDictionary<string, object?> BindingData { get; } = new Dictionary<string, object?>();
}

internal sealed class TestFunctionDefinition : FunctionDefinition
{
    public override string PathToAssembly => typeof(TestFunctionDefinition).Assembly.Location;
    public override string EntryPoint => typeof(TestFunctionDefinition).FullName ?? nameof(TestFunctionDefinition);
    public override string Id => "bdd-definition";
    public override string Name => "bdd-definition";
    public override IImmutableDictionary<string, BindingMetadata> InputBindings { get; } = ImmutableDictionary<string, BindingMetadata>.Empty;
    public override IImmutableDictionary<string, BindingMetadata> OutputBindings { get; } = ImmutableDictionary<string, BindingMetadata>.Empty;
    public override ImmutableArray<FunctionParameter> Parameters { get; } = [];
}
